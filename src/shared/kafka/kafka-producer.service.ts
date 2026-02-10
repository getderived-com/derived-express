import { v4 as uuidv4 } from "uuid";
import { kafkaClient } from "./kafka-client";
import { KafkaEvent, EventSchema, KafkaTopic } from "./event-types";
import { CompressionTypes } from "kafkajs";

export class KafkaProducerService {
    private static instance: KafkaProducerService;

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

            console.log(`Event published to ${topic}:`, {
                eventId: validatedEvent.eventId,
                eventType: validatedEvent.eventType,
            });
        } catch (error) {
            console.error(`Failed to publish event to ${topic}:`, error);
            throw new Error(`Failed to publish event: ${error}`);
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

            console.log(`Batch of ${events.length} events published to ${topic}`);
        } catch (error) {
            console.error(`Failed to publish batch to ${topic}:`, error);
            throw new Error(`Failed to publish batch: ${error}`);
        }
    }

    /**
     * Publish event with transaction support
     */
    public async publishEventTransactional<T extends KafkaEvent>(
        topic: KafkaTopic,
        event: Omit<T, "eventId" | "timestamp">
    ): Promise<void> {
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
            console.log(`Transactional event published to ${topic}`);
        } catch (error) {
            await transaction.abort();
            console.error(`Transaction aborted for ${topic}:`, error);
            throw new Error(`Failed to publish transactional event: ${error}`);
        }
    }
}

export const kafkaProducer = KafkaProducerService.getInstance();
