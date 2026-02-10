import { z } from "zod";

// Base Event Schema
export const BaseEventSchema = z.object({
    eventId: z.string().uuid(),
    eventType: z.string(),
    timestamp: z.string().datetime(),
    version: z.string().default("1.0"),
    metadata: z.record(z.unknown()).optional(),
});

// User Events
export const UserCreatedEventSchema = BaseEventSchema.extend({
    eventType: z.literal("user.created"),
    payload: z.object({
        userId: z.string(),
        email: z.string().email(),
        name: z.string(),
    }),
});

export const UserUpdatedEventSchema = BaseEventSchema.extend({
    eventType: z.literal("user.updated"),
    payload: z.object({
        userId: z.string(),
        changes: z.record(z.unknown()),
    }),
});

export const UserDeletedEventSchema = BaseEventSchema.extend({
    eventType: z.literal("user.deleted"),
    payload: z.object({
        userId: z.string(),
    }),
});

// Order Events (example)
export const OrderCreatedEventSchema = BaseEventSchema.extend({
    eventType: z.literal("order.created"),
    payload: z.object({
        orderId: z.string(),
        userId: z.string(),
        amount: z.number(),
        items: z.array(z.object({
            productId: z.string(),
            quantity: z.number(),
            price: z.number(),
        })),
    }),
});

// DLQ Events
export const DLQMessageEventSchema = BaseEventSchema.extend({
    eventType: z.literal("dlq.message"),
    payload: z.object({
        originalTopic: z.string(),
        originalPartition: z.number(),
        originalOffset: z.string(),
        originalMessage: z.string().optional(),
        error: z.string(),
        errorStack: z.string().optional(),
    }),
});

// Union of all event types
export const EventSchema = z.discriminatedUnion("eventType", [
    UserCreatedEventSchema,
    UserUpdatedEventSchema,
    UserDeletedEventSchema,
    OrderCreatedEventSchema,
    DLQMessageEventSchema,
]);

// TypeScript types
export type BaseEvent = z.infer<typeof BaseEventSchema>;
export type UserCreatedEvent = z.infer<typeof UserCreatedEventSchema>;
export type UserUpdatedEvent = z.infer<typeof UserUpdatedEventSchema>;
export type UserDeletedEvent = z.infer<typeof UserDeletedEventSchema>;
export type OrderCreatedEvent = z.infer<typeof OrderCreatedEventSchema>;
export type DLQMessageEvent = z.infer<typeof DLQMessageEventSchema>;
export type KafkaEvent = z.infer<typeof EventSchema>;

// Topic names
export const KAFKA_TOPICS = {
    USER_EVENTS: "user.events",
    ORDER_EVENTS: "order.events",
    NOTIFICATION_EVENTS: "notification.events",
    DLQ: "dead-letter-queue",
} as const;

export type KafkaTopic = typeof KAFKA_TOPICS[keyof typeof KAFKA_TOPICS];
