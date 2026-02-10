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
}

export class KafkaConsumerService {
    private static instance: KafkaConsumerService;
    private handlers: Map<string, EventHandler> = new Map();
    private isRunning = false;

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
        console.log(`Handler registered for event type: ${eventType}`);
    }

    /**
     * Start consuming messages from Kafka
     */
    public async start(config: ConsumerConfig): Promise<void> {
        if (this.isRunning) {
            console.warn("Consumer is already running");
            return;
        }

        try {
            const consumer = await kafkaClient.getConsumer(config.groupId);

            // Subscribe to topics
            await consumer.subscribe({
                topics: config.topics,
                fromBeginning: config.fromBeginning ?? false,
            });

            console.log(`Subscribed to topics: ${config.topics.join(", ")}`);

            // Start consuming
            await consumer.run({
                autoCommit: config.autoCommit ?? true,
                eachMessage: async (payload: EachMessagePayload) => {
                    await this.handleMessage(payload, config.maxRetries ?? 3);
                },
            });

            this.isRunning = true;
            console.log("Kafka consumer started successfully");
        } catch (error) {
            console.error("Failed to start Kafka consumer:", error);
            throw error;
        }
    }

    /**
     * Handle incoming Kafka message
     */
    private async handleMessage(
        payload: EachMessagePayload,
        maxRetries: number
    ): Promise<void> {
        const { topic, partition, message } = payload;

        try {
            if (!message.value) {
                console.warn("Received message with no value");
                return;
            }

            // Parse and validate event
            const rawEvent = JSON.parse(message.value.toString());
            const event = EventSchema.parse(rawEvent);

            console.log(`Received event:`, {
                eventType: event.eventType,
                eventId: event.eventId,
                topic,
                partition,
                offset: message.offset,
            });

            // Find and execute handler
            const handler = this.handlers.get(event.eventType);

            if (!handler) {
                console.warn(`No handler registered for event type: ${event.eventType}`);
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
                maxRetries,
                event
            );

            console.log(`Event processed successfully:`, {
                eventType: event.eventType,
                eventId: event.eventId,
            });
        } catch (error) {
            console.error("Error processing message:", error);

            // Send to DLQ
            await this.sendToDeadLetterQueue(payload, error);
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

                if (attempt < maxRetries) {
                    const backoffMs = Math.min(1000 * Math.pow(2, attempt), 30000);
                    console.warn(
                        `Retry attempt ${attempt + 1}/${maxRetries} for event ${event.eventId} after ${backoffMs}ms`
                    );
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

            console.log(`Message sent to DLQ from topic ${topic}`);
        } catch (dlqError) {
            console.error("Failed to send message to DLQ:", dlqError);
        }
    }

    /**
     * Stop consuming messages
     */
    public async stop(): Promise<void> {
        if (!this.isRunning) {
            return;
        }

        this.isRunning = false;
        console.log("Kafka consumer stopped");
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

export const kafkaConsumer = KafkaConsumerService.getInstance();
