import { EachMessagePayload } from "kafkajs";
import { kafkaClient } from "./kafka-client";
import { EventSchema, KafkaEvent, KafkaTopic, KAFKA_TOPICS } from "./event-types";
import { kafkaProducer } from "./kafka-producer.service";

export type EventHandler<T extends KafkaEvent = KafkaEvent> = (
    event: T,
    context: {
        topic: string;
        partition: number;
        offset: string;
        timestamp: string;
    }
) => Promise<void>;

interface ConsumerConfig {
    topics: KafkaTopic[];
    groupId?: string;
    fromBeginning?: boolean;
    autoCommit?: boolean;
    maxRetries?: number;
    enableDLQ?: boolean;
}

interface ConsumerMetrics {
    totalProcessed: number;
    totalFailed: number;
    totalRetries: number;
    lastProcessedAt?: Date;
    averageProcessingTime: number;
}

export class KafkaConsumerService {
    private static instance: KafkaConsumerService;
    private handlers: Map<string, EventHandler> = new Map();
    private isRunning = false;
    private isPaused = false;
    private metrics: ConsumerMetrics = {
        totalProcessed: 0,
        totalFailed: 0,
        totalRetries: 0,
        averageProcessingTime: 0,
    };
    private processingTimes: number[] = [];
    private currentConfig?: ConsumerConfig;

    private constructor() { }

    public static getInstance(): KafkaConsumerService {
        if (!KafkaConsumerService.instance) {
            KafkaConsumerService.instance = new KafkaConsumerService();
        }
        return KafkaConsumerService.instance;
    }

    /**
     * Register an event handler for a specific event type
     */
    public registerHandler<T extends KafkaEvent>(
        eventType: string,
        handler: EventHandler<T>
    ): void {
        this.handlers.set(eventType, handler as EventHandler);
        this.log("info", "Handler registered", { eventType });
    }

    /**
     * Start consuming messages from Kafka
     */
    public async start(config: ConsumerConfig): Promise<void> {
        if (this.isRunning) {
            this.log("warn", "Consumer is already running");
            return;
        }

        try {
            this.currentConfig = config;
            const consumer = await kafkaClient.getConsumer(config.groupId);

            // Subscribe to topics
            await consumer.subscribe({
                topics: config.topics,
                fromBeginning: config.fromBeginning ?? false,
            });

            this.log("info", "Subscribed to topics", { topics: config.topics });

            // Start consuming
            await consumer.run({
                autoCommit: config.autoCommit ?? true,
                eachMessage: async (payload: EachMessagePayload) => {
                    // Handle pause state
                    while (this.isPaused) {
                        await this.sleep(100);
                    }
                    await this.handleMessage(payload, config);
                },
            });

            this.isRunning = true;
            this.log("info", "Kafka consumer started successfully", {
                topics: config.topics,
                groupId: config.groupId,
            });
        } catch (error) {
            this.log("error", "Failed to start Kafka consumer", { error });
            throw error;
        }
    }

    /**
     * Handle incoming Kafka message
     */
    private async handleMessage(
        payload: EachMessagePayload,
        config: ConsumerConfig
    ): Promise<void> {
        const { topic, partition, message } = payload;
        const startTime = Date.now();

        try {
            if (!message.value) {
                this.log("warn", "Received message with no value", { topic, partition });
                return;
            }

            // Parse and validate event
            const rawEvent = JSON.parse(message.value.toString());
            const event = EventSchema.parse(rawEvent);

            this.log("info", "Received event", {
                eventType: event.eventType,
                eventId: event.eventId,
                topic,
                partition,
                offset: message.offset,
            });

            // Find and execute handler
            const handler = this.handlers.get(event.eventType);

            if (!handler) {
                this.log("warn", "No handler registered for event type", {
                    eventType: event.eventType,
                });
                return;
            }

            const context = {
                topic,
                partition,
                offset: message.offset,
                timestamp: message.timestamp,
            };

            // Execute handler with retry logic
            await this.executeWithRetry(
                () => handler(event, context),
                config.maxRetries ?? 3,
                event
            );

            this.metrics.totalProcessed++;
            this.metrics.lastProcessedAt = new Date();
            this.updateProcessingMetrics(Date.now() - startTime);

            this.log("info", "Event processed successfully", {
                eventType: event.eventType,
                eventId: event.eventId,
                processingTimeMs: Date.now() - startTime,
            });
        } catch (error) {
            this.metrics.totalFailed++;
            this.log("error", "Error processing message", {
                topic,
                partition,
                offset: message.offset,
                error,
            });

            // Send to DLQ if enabled
            if (config.enableDLQ !== false) {
                await this.sendToDeadLetterQueue(payload, error);
            }
        }
    }

    /**
     * Execute handler with exponential backoff retry
     */
    private async executeWithRetry(
        fn: () => Promise<void>,
        maxRetries: number,
        event: KafkaEvent
    ): Promise<void> {
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                await fn();
                return; // Success
            } catch (error) {
                lastError = error as Error;
                this.metrics.totalRetries++;

                if (attempt < maxRetries) {
                    const backoffMs = Math.min(1000 * Math.pow(2, attempt), 30000);
                    this.log("warn", "Retrying event processing", {
                        eventId: event.eventId,
                        attempt: attempt + 1,
                        maxRetries,
                        backoffMs,
                    });
                    await this.sleep(backoffMs);
                }
            }
        }

        throw lastError || new Error("Max retries exceeded");
    }

    /**
     * Send failed message to Dead Letter Queue
     */
    private async sendToDeadLetterQueue(
        payload: EachMessagePayload,
        error: unknown
    ): Promise<void> {
        try {
            const { topic, partition, message } = payload;

            await kafkaProducer.publishEvent(KAFKA_TOPICS.DLQ, {
                eventType: "dlq.message" as any,
                version: "1.0",
                payload: {
                    originalTopic: topic,
                    originalPartition: partition,
                    originalOffset: message.offset,
                    originalMessage: message.value?.toString(),
                    error: error instanceof Error ? error.message : String(error),
                    errorStack: error instanceof Error ? error.stack : undefined,
                },
            });

            this.log("info", "Message sent to DLQ", {
                originalTopic: topic,
                partition,
                offset: message.offset,
            });
        } catch (dlqError) {
            this.log("error", "Failed to send message to DLQ", { error: dlqError });
        }
    }

    /**
     * Pause message consumption (for backpressure handling)
     */
    public pause(): void {
        this.isPaused = true;
        this.log("info", "Consumer paused");
    }

    /**
     * Resume message consumption
     */
    public resume(): void {
        this.isPaused = false;
        this.log("info", "Consumer resumed");
    }

    /**
     * Stop consuming messages
     */
    public async stop(): Promise<void> {
        if (!this.isRunning) {
            return;
        }

        this.isRunning = false;
        this.log("info", "Kafka consumer stopped");
    }

    public getMetrics(): ConsumerMetrics {
        return { ...this.metrics };
    }

    public isConsumerRunning(): boolean {
        return this.isRunning;
    }

    public isConsumerPaused(): boolean {
        return this.isPaused;
    }

    private updateProcessingMetrics(processingTime: number): void {
        this.processingTimes.push(processingTime);
        // Keep only last 100 processing times for average calculation
        if (this.processingTimes.length > 100) {
            this.processingTimes.shift();
        }
        this.metrics.averageProcessingTime =
            this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
    }

    private log(level: "info" | "warn" | "error", message: string, context?: Record<string, any>): void {
        const logData = {
            timestamp: new Date().toISOString(),
            level,
            component: "KafkaConsumer",
            message,
            ...context,
        };

        if (level === "error") {
            console.error(JSON.stringify(logData));
        } else if (level === "warn") {
            console.warn(JSON.stringify(logData));
        } else {
            console.log(JSON.stringify(logData));
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

export const kafkaConsumer = KafkaConsumerService.getInstance();
