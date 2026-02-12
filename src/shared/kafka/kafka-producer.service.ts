import { v4 as uuidv4 } from "uuid";
import { kafkaClient } from "./kafka-client";
import { KafkaEvent, EventSchema, KafkaTopic } from "./event-types";
import { CompressionTypes } from "kafkajs";

class KafkaProducerError extends Error {
    constructor(
        message: string,
        public readonly topic: string,
        public readonly originalError?: unknown
    ) {
        super(message);
        this.name = "KafkaProducerError";
    }
}

interface ProducerMetrics {
    totalPublished: number;
    totalFailed: number;
    lastPublishedAt?: Date;
    averageBatchSize: number;
}

export class KafkaProducerService {
    private static instance: KafkaProducerService;
    private metrics: ProducerMetrics = {
        totalPublished: 0,
        totalFailed: 0,
        averageBatchSize: 0,
    };
    private batchSizes: number[] = [];
    private readonly MAX_BATCH_SIZE = 1000;

    private constructor() { }

    public static getInstance(): KafkaProducerService {
        if (!KafkaProducerService.instance) {
            KafkaProducerService.instance = new KafkaProducerService();
        }
        return KafkaProducerService.instance;
    }

    /**
     * Publish a single event to Kafka
     */
    public async publishEvent<T extends KafkaEvent>(
        topic: KafkaTopic,
        event: Omit<T, "eventId" | "timestamp">,
        options?: {
            key?: string;
            partition?: number;
            headers?: Record<string, string>;
        }
    ): Promise<void> {
        const startTime = Date.now();

        try {
            // Add event metadata
            const enrichedEvent: KafkaEvent = {
                ...event,
                eventId: uuidv4(),
                timestamp: new Date().toISOString(),
            } as KafkaEvent;

            // Validate event schema
            const validatedEvent = EventSchema.parse(enrichedEvent);

            const producer = await kafkaClient.getProducer();

            await producer.send({
                topic,
                compression: CompressionTypes.GZIP,
                messages: [
                    {
                        key: options?.key || validatedEvent.eventId,
                        value: JSON.stringify(validatedEvent),
                        partition: options?.partition,
                        headers: {
                            ...options?.headers,
                            eventType: validatedEvent.eventType,
                            eventId: validatedEvent.eventId,
                        },
                    },
                ],
            });

            this.metrics.totalPublished++;
            this.metrics.lastPublishedAt = new Date();

            const duration = Date.now() - startTime;
            this.log("info", "Event published successfully", {
                topic,
                eventId: validatedEvent.eventId,
                eventType: validatedEvent.eventType,
                durationMs: duration,
            });
        } catch (error) {
            this.metrics.totalFailed++;
            this.log("error", "Failed to publish event", {
                topic,
                eventType: event.eventType,
                error,
            });
            throw new KafkaProducerError(
                `Failed to publish event to ${topic}`,
                topic,
                error
            );
        }
    }

    /**
     * Publish multiple events in a batch
     */
    public async publishBatch<T extends KafkaEvent>(
        topic: KafkaTopic,
        events: Array<Omit<T, "eventId" | "timestamp">>,
        options?: {
            keyExtractor?: (event: T) => string;
        }
    ): Promise<void> {
        const startTime = Date.now();

        if (events.length === 0) {
            this.log("warn", "Attempted to publish empty batch", { topic });
            return;
        }

        if (events.length > this.MAX_BATCH_SIZE) {
            throw new KafkaProducerError(
                `Batch size ${events.length} exceeds maximum ${this.MAX_BATCH_SIZE}`,
                topic
            );
        }

        try {
            const enrichedEvents = events.map((event) => {
                const enriched = {
                    ...event,
                    eventId: uuidv4(),
                    timestamp: new Date().toISOString(),
                } as KafkaEvent;
                return EventSchema.parse(enriched);
            });

            const producer = await kafkaClient.getProducer();

            await producer.send({
                topic,
                compression: CompressionTypes.GZIP,
                messages: enrichedEvents.map((event) => ({
                    key: options?.keyExtractor?.(event as T) || event.eventId,
                    value: JSON.stringify(event),
                    headers: {
                        eventType: event.eventType,
                        eventId: event.eventId,
                    },
                })),
            });

            this.metrics.totalPublished += events.length;
            this.metrics.lastPublishedAt = new Date();
            this.updateBatchMetrics(events.length);

            const duration = Date.now() - startTime;
            this.log("info", "Batch published successfully", {
                topic,
                batchSize: events.length,
                durationMs: duration,
            });
        } catch (error) {
            this.metrics.totalFailed += events.length;
            this.log("error", "Failed to publish batch", {
                topic,
                batchSize: events.length,
                error,
            });
            throw new KafkaProducerError(
                `Failed to publish batch to ${topic}`,
                topic,
                error
            );
        }
    }

    /**
     * Publish event with transaction support
     */
    public async publishEventTransactional<T extends KafkaEvent>(
        topic: KafkaTopic,
        event: Omit<T, "eventId" | "timestamp">
    ): Promise<void> {
        const startTime = Date.now();
        const producer = await kafkaClient.getProducer();
        const transaction = await producer.transaction();

        try {
            const enrichedEvent: KafkaEvent = {
                ...event,
                eventId: uuidv4(),
                timestamp: new Date().toISOString(),
            } as KafkaEvent;

            const validatedEvent = EventSchema.parse(enrichedEvent);

            await transaction.send({
                topic,
                messages: [
                    {
                        key: validatedEvent.eventId,
                        value: JSON.stringify(validatedEvent),
                        headers: {
                            eventType: validatedEvent.eventType,
                            eventId: validatedEvent.eventId,
                        },
                    },
                ],
            });

            await transaction.commit();

            this.metrics.totalPublished++;
            this.metrics.lastPublishedAt = new Date();

            const duration = Date.now() - startTime;
            this.log("info", "Transactional event published successfully", {
                topic,
                eventId: validatedEvent.eventId,
                durationMs: duration,
            });
        } catch (error) {
            await transaction.abort();
            this.metrics.totalFailed++;

            this.log("error", "Transaction aborted", {
                topic,
                eventType: event.eventType,
                error,
            });

            throw new KafkaProducerError(
                `Failed to publish transactional event to ${topic}`,
                topic,
                error
            );
        }
    }

    public getMetrics(): ProducerMetrics {
        return { ...this.metrics };
    }

    private updateBatchMetrics(batchSize: number): void {
        this.batchSizes.push(batchSize);
        // Keep only last 100 batch sizes for average calculation
        if (this.batchSizes.length > 100) {
            this.batchSizes.shift();
        }
        this.metrics.averageBatchSize =
            this.batchSizes.reduce((a, b) => a + b, 0) / this.batchSizes.length;
    }

    private log(level: "info" | "warn" | "error", message: string, context?: Record<string, any>): void {
        const logData = {
            timestamp: new Date().toISOString(),
            level,
            component: "KafkaProducer",
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
}

export const kafkaProducer = KafkaProducerService.getInstance();
