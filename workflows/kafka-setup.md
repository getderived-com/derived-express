# Production-Grade Kafka Setup for Express Application

This guide provides a comprehensive, step-by-step approach to implementing Apache Kafka in your Express application with production-ready patterns, error handling, monitoring, and scalability.

## 📋 Overview

**What we'll implement:**
- Kafka producer and consumer services with connection pooling
- Event-driven architecture with typed events
- Dead Letter Queue (DLQ) pattern for failed messages
- Retry mechanisms with exponential backoff
- Health checks and monitoring
- Graceful shutdown handling
- Docker Compose setup for local development
- Production deployment considerations

**Technology Stack:**
- **KafkaJS** - Modern Kafka client for Node.js
- **Zod** - Schema validation for events
- **Docker** - Local Kafka cluster
- **Prometheus** (optional) - Metrics collection

---

## Phase 1: Infrastructure Setup

### Step 1: Install Dependencies

Install the required npm packages:

```bash
bun add kafkajs
bun add -D @types/kafkajs
```

### Step 2: Create Docker Compose for Local Development

Create `docker-compose.kafka.yml` in the project root:

```yaml
version: '3.8'

services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    hostname: zookeeper
    container_name: zookeeper
    ports:
      - "2181:2181"
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    volumes:
      - zookeeper-data:/var/lib/zookeeper/data
      - zookeeper-logs:/var/lib/zookeeper/log
    networks:
      - kafka-network

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    hostname: kafka
    container_name: kafka
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
      - "9093:9093"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: 'zookeeper:2181'
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:29092,PLAINTEXT_HOST://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 1
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 1
      KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS: 0
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: 'true'
      KAFKA_LOG_RETENTION_HOURS: 168
      KAFKA_LOG_SEGMENT_BYTES: 1073741824
    volumes:
      - kafka-data:/var/lib/kafka/data
    networks:
      - kafka-network
    healthcheck:
      test: ["CMD", "kafka-broker-api-versions", "--bootstrap-server", "localhost:9092"]
      interval: 10s
      timeout: 10s
      retries: 5

  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    container_name: kafka-ui
    depends_on:
      - kafka
    ports:
      - "8080:8080"
    environment:
      KAFKA_CLUSTERS_0_NAME: local
      KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafka:29092
      KAFKA_CLUSTERS_0_ZOOKEEPER: zookeeper:2181
    networks:
      - kafka-network

volumes:
  zookeeper-data:
  zookeeper-logs:
  kafka-data:

networks:
  kafka-network:
    driver: bridge
```

### Step 3: Start Kafka Cluster

```bash
docker-compose -f docker-compose.kafka.yml up -d
```

Verify Kafka is running:
```bash
docker-compose -f docker-compose.kafka.yml ps
```

Access Kafka UI at `http://localhost:8080` to manage topics and monitor messages.

---

## Phase 2: Core Kafka Infrastructure

### Step 4: Update Environment Configuration

Add Kafka configuration to `.env.example`:

```env
# Kafka Configuration
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=express-api
KAFKA_GROUP_ID=express-api-consumer-group
KAFKA_CONNECTION_TIMEOUT=10000
KAFKA_REQUEST_TIMEOUT=30000
KAFKA_RETRY_ATTEMPTS=5
KAFKA_RETRY_BACKOFF_MS=300
KAFKA_LOG_LEVEL=info
```

### Step 5: Update App Settings

Modify `src/shared/app-settings.ts` to include Kafka configuration:

```typescript
import * as dotenv from "dotenv";
dotenv.config({ path: `${process.cwd()}/.env` });

const {
  NODE_ENV = "development",
  PORT = 3000,
  JWT_SECRET = "your-super-secret-jwt-key-change-this-in-production",
  JWT_EXPIRES_IN = "7d",
  ALLOWED_ORIGINS = "http://localhost:3000",
  DATABASE_URL = "",
  
  // Kafka Configuration
  KAFKA_BROKERS = "localhost:9092",
  KAFKA_CLIENT_ID = "express-api",
  KAFKA_GROUP_ID = "express-api-consumer-group",
  KAFKA_CONNECTION_TIMEOUT = "10000",
  KAFKA_REQUEST_TIMEOUT = "30000",
  KAFKA_RETRY_ATTEMPTS = "5",
  KAFKA_RETRY_BACKOFF_MS = "300",
  KAFKA_LOG_LEVEL = "info",
} = process.env;

if (NODE_ENV === "production") {
  const requiredEnvVars = ["JWT_SECRET", "DATABASE_URL", "KAFKA_BROKERS"];
  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName],
  );

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}`,
    );
  }

  if (JWT_SECRET === "your-super-secret-jwt-key-change-this-in-production") {
    throw new Error("JWT_SECRET must be changed in production!");
  }
}

export const APP_SETTINGS = {
  NODE_ENV,
  PORT: parseInt(String(PORT)),
  IS_DEVELOPMENT: NODE_ENV === "development",
  IS_PRODUCTION: NODE_ENV === "production",
  JWT_SECRET,
  JWT_EXPIRES_IN,
  ALLOWED_ORIGINS,
  DATABASE_URL,
  
  // Kafka Settings
  KAFKA: {
    BROKERS: KAFKA_BROKERS.split(","),
    CLIENT_ID: KAFKA_CLIENT_ID,
    GROUP_ID: KAFKA_GROUP_ID,
    CONNECTION_TIMEOUT: parseInt(KAFKA_CONNECTION_TIMEOUT),
    REQUEST_TIMEOUT: parseInt(KAFKA_REQUEST_TIMEOUT),
    RETRY: {
      ATTEMPTS: parseInt(KAFKA_RETRY_ATTEMPTS),
      BACKOFF_MS: parseInt(KAFKA_RETRY_BACKOFF_MS),
    },
    LOG_LEVEL: KAFKA_LOG_LEVEL as "debug" | "info" | "warn" | "error",
  },
};
```

### Step 6: Create Event Type Definitions

Create `src/shared/kafka/event-types.ts`:

```typescript
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

// Union of all event types
export const EventSchema = z.discriminatedUnion("eventType", [
  UserCreatedEventSchema,
  UserUpdatedEventSchema,
  UserDeletedEventSchema,
  OrderCreatedEventSchema,
]);

// TypeScript types
export type BaseEvent = z.infer<typeof BaseEventSchema>;
export type UserCreatedEvent = z.infer<typeof UserCreatedEventSchema>;
export type UserUpdatedEvent = z.infer<typeof UserUpdatedEventSchema>;
export type UserDeletedEvent = z.infer<typeof UserDeletedEventSchema>;
export type OrderCreatedEvent = z.infer<typeof OrderCreatedEventSchema>;
export type KafkaEvent = z.infer<typeof EventSchema>;

// Topic names
export const KAFKA_TOPICS = {
  USER_EVENTS: "user.events",
  ORDER_EVENTS: "order.events",
  NOTIFICATION_EVENTS: "notification.events",
  DLQ: "dead-letter-queue",
} as const;

export type KafkaTopic = typeof KAFKA_TOPICS[keyof typeof KAFKA_TOPICS];
```

### Step 7: Create Kafka Client Singleton

Create `src/shared/kafka/kafka-client.ts`:

```typescript
import { Kafka, logLevel, Producer, Consumer, Admin } from "kafkajs";
import { APP_SETTINGS } from "../app-settings";

class KafkaClient {
  private static instance: KafkaClient;
  private kafka: Kafka;
  private producer: Producer | null = null;
  private consumers: Map<string, Consumer> = new Map();
  private admin: Admin | null = null;
  private isShuttingDown = false;

  private constructor() {
    this.kafka = new Kafka({
      clientId: APP_SETTINGS.KAFKA.CLIENT_ID,
      brokers: APP_SETTINGS.KAFKA.BROKERS,
      connectionTimeout: APP_SETTINGS.KAFKA.CONNECTION_TIMEOUT,
      requestTimeout: APP_SETTINGS.KAFKA.REQUEST_TIMEOUT,
      retry: {
        initialRetryTime: APP_SETTINGS.KAFKA.RETRY.BACKOFF_MS,
        retries: APP_SETTINGS.KAFKA.RETRY.ATTEMPTS,
        multiplier: 2,
        maxRetryTime: 30000,
      },
      logLevel: this.mapLogLevel(APP_SETTINGS.KAFKA.LOG_LEVEL),
    });
  }

  public static getInstance(): KafkaClient {
    if (!KafkaClient.instance) {
      KafkaClient.instance = new KafkaClient();
    }
    return KafkaClient.instance;
  }

  private mapLogLevel(level: string): logLevel {
    const levels: Record<string, logLevel> = {
      debug: logLevel.DEBUG,
      info: logLevel.INFO,
      warn: logLevel.WARN,
      error: logLevel.ERROR,
    };
    return levels[level] || logLevel.INFO;
  }

  public async getProducer(): Promise<Producer> {
    if (this.isShuttingDown) {
      throw new Error("Kafka client is shutting down");
    }

    if (!this.producer) {
      this.producer = this.kafka.producer({
        allowAutoTopicCreation: APP_SETTINGS.IS_DEVELOPMENT,
        transactionTimeout: 30000,
        idempotent: true, // Ensures exactly-once semantics
        maxInFlightRequests: 5,
        retry: {
          initialRetryTime: APP_SETTINGS.KAFKA.RETRY.BACKOFF_MS,
          retries: APP_SETTINGS.KAFKA.RETRY.ATTEMPTS,
        },
      });

      await this.producer.connect();
      console.log("✅ Kafka Producer connected");
    }

    return this.producer;
  }

  public async getConsumer(groupId?: string): Promise<Consumer> {
    if (this.isShuttingDown) {
      throw new Error("Kafka client is shutting down");
    }

    const consumerGroupId = groupId || APP_SETTINGS.KAFKA.GROUP_ID;

    if (!this.consumers.has(consumerGroupId)) {
      const consumer = this.kafka.consumer({
        groupId: consumerGroupId,
        sessionTimeout: 30000,
        heartbeatInterval: 3000,
        maxBytesPerPartition: 1048576, // 1MB
        retry: {
          initialRetryTime: APP_SETTINGS.KAFKA.RETRY.BACKOFF_MS,
          retries: APP_SETTINGS.KAFKA.RETRY.ATTEMPTS,
        },
      });

      await consumer.connect();
      this.consumers.set(consumerGroupId, consumer);
      console.log(`✅ Kafka Consumer connected (group: ${consumerGroupId})`);
    }

    return this.consumers.get(consumerGroupId)!;
  }

  public async getAdmin(): Promise<Admin> {
    if (this.isShuttingDown) {
      throw new Error("Kafka client is shutting down");
    }

    if (!this.admin) {
      this.admin = this.kafka.admin();
      await this.admin.connect();
      console.log("✅ Kafka Admin connected");
    }

    return this.admin;
  }

  public async disconnect(): Promise<void> {
    this.isShuttingDown = true;
    console.log("🔄 Disconnecting Kafka clients...");

    try {
      if (this.producer) {
        await this.producer.disconnect();
        this.producer = null;
        console.log("✅ Kafka Producer disconnected");
      }

      for (const [groupId, consumer] of this.consumers.entries()) {
        await consumer.disconnect();
        console.log(`✅ Kafka Consumer disconnected (group: ${groupId})`);
      }
      this.consumers.clear();

      if (this.admin) {
        await this.admin.disconnect();
        this.admin = null;
        console.log("✅ Kafka Admin disconnected");
      }
    } catch (error) {
      console.error("❌ Error disconnecting Kafka clients:", error);
      throw error;
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const admin = await this.getAdmin();
      await admin.listTopics();
      return true;
    } catch (error) {
      console.error("❌ Kafka health check failed:", error);
      return false;
    }
  }
}

export const kafkaClient = KafkaClient.getInstance();
```

### Step 8: Create Kafka Producer Service

Create `src/shared/kafka/kafka-producer.service.ts`:

```typescript
import { v4 as uuidv4 } from "uuid";
import { kafkaClient } from "./kafka-client";
import { KafkaEvent, EventSchema, KafkaTopic } from "./event-types";
import { CompressionTypes } from "kafkajs";

export class KafkaProducerService {
  private static instance: KafkaProducerService;

  private constructor() {}

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

      console.log(`📤 Event published to ${topic}:`, {
        eventId: validatedEvent.eventId,
        eventType: validatedEvent.eventType,
      });
    } catch (error) {
      console.error(`❌ Failed to publish event to ${topic}:`, error);
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

      console.log(`📤 Batch of ${events.length} events published to ${topic}`);
    } catch (error) {
      console.error(`❌ Failed to publish batch to ${topic}:`, error);
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
      console.log(`📤 Transactional event published to ${topic}`);
    } catch (error) {
      await transaction.abort();
      console.error(`❌ Transaction aborted for ${topic}:`, error);
      throw new Error(`Failed to publish transactional event: ${error}`);
    }
  }
}

export const kafkaProducer = KafkaProducerService.getInstance();
```

### Step 9: Create Kafka Consumer Service

Create `src/shared/kafka/kafka-consumer.service.ts`:

```typescript
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

  private constructor() {}

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
    console.log(`✅ Handler registered for event type: ${eventType}`);
  }

  /**
   * Start consuming messages from Kafka
   */
  public async start(config: ConsumerConfig): Promise<void> {
    if (this.isRunning) {
      console.warn("⚠️ Consumer is already running");
      return;
    }

    try {
      const consumer = await kafkaClient.getConsumer(config.groupId);

      // Subscribe to topics
      await consumer.subscribe({
        topics: config.topics,
        fromBeginning: config.fromBeginning ?? false,
      });

      console.log(`🎧 Subscribed to topics: ${config.topics.join(", ")}`);

      // Start consuming
      await consumer.run({
        autoCommit: config.autoCommit ?? true,
        eachMessage: async (payload: EachMessagePayload) => {
          await this.handleMessage(payload, config.maxRetries ?? 3);
        },
      });

      this.isRunning = true;
      console.log("✅ Kafka consumer started successfully");
    } catch (error) {
      console.error("❌ Failed to start Kafka consumer:", error);
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
        console.warn("⚠️ Received message with no value");
        return;
      }

      // Parse and validate event
      const rawEvent = JSON.parse(message.value.toString());
      const event = EventSchema.parse(rawEvent);

      console.log(`📥 Received event:`, {
        eventType: event.eventType,
        eventId: event.eventId,
        topic,
        partition,
        offset: message.offset,
      });

      // Find and execute handler
      const handler = this.handlers.get(event.eventType);

      if (!handler) {
        console.warn(`⚠️ No handler registered for event type: ${event.eventType}`);
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

      console.log(`✅ Event processed successfully:`, {
        eventType: event.eventType,
        eventId: event.eventId,
      });
    } catch (error) {
      console.error("❌ Error processing message:", error);
      
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
            `⚠️ Retry attempt ${attempt + 1}/${maxRetries} for event ${event.eventId} after ${backoffMs}ms`
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

      console.log(`📮 Message sent to DLQ from topic ${topic}`);
    } catch (dlqError) {
      console.error("❌ Failed to send message to DLQ:", dlqError);
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
    console.log("🛑 Kafka consumer stopped");
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const kafkaConsumer = KafkaConsumerService.getInstance();
```

---

## Phase 3: Integration with Express

### Step 10: Create Kafka Initialization Module

Create `src/shared/kafka/kafka-init.ts`:

```typescript
import { kafkaClient } from "./kafka-client";
import { kafkaConsumer } from "./kafka-consumer.service";
import { KAFKA_TOPICS } from "./event-types";
import { APP_SETTINGS } from "../app-settings";

/**
 * Initialize Kafka infrastructure
 */
export async function initializeKafka(): Promise<void> {
  try {
    console.log("🚀 Initializing Kafka...");

    // Create admin client to manage topics
    const admin = await kafkaClient.getAdmin();

    // Create topics if they don't exist
    const existingTopics = await admin.listTopics();
    const topicsToCreate = Object.values(KAFKA_TOPICS).filter(
      (topic) => !existingTopics.includes(topic)
    );

    if (topicsToCreate.length > 0) {
      await admin.createTopics({
        topics: topicsToCreate.map((topic) => ({
          topic,
          numPartitions: APP_SETTINGS.IS_PRODUCTION ? 3 : 1,
          replicationFactor: APP_SETTINGS.IS_PRODUCTION ? 2 : 1,
          configEntries: [
            { name: "retention.ms", value: "604800000" }, // 7 days
            { name: "cleanup.policy", value: "delete" },
          ],
        })),
      });
      console.log(`✅ Created topics: ${topicsToCreate.join(", ")}`);
    }

    // Initialize producer
    await kafkaClient.getProducer();

    console.log("✅ Kafka initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize Kafka:", error);
    throw error;
  }
}

/**
 * Start Kafka consumers
 */
export async function startKafkaConsumers(): Promise<void> {
  try {
    console.log("🎧 Starting Kafka consumers...");

    // Register your event handlers here
    // Example:
    // kafkaConsumer.registerHandler("user.created", handleUserCreated);
    // kafkaConsumer.registerHandler("order.created", handleOrderCreated);

    // Start consuming
    await kafkaConsumer.start({
      topics: [
        KAFKA_TOPICS.USER_EVENTS,
        KAFKA_TOPICS.ORDER_EVENTS,
        KAFKA_TOPICS.NOTIFICATION_EVENTS,
      ],
      fromBeginning: false,
      autoCommit: true,
      maxRetries: 3,
    });

    console.log("✅ Kafka consumers started successfully");
  } catch (error) {
    console.error("❌ Failed to start Kafka consumers:", error);
    throw error;
  }
}

/**
 * Gracefully shutdown Kafka
 */
export async function shutdownKafka(): Promise<void> {
  try {
    console.log("🔄 Shutting down Kafka...");
    await kafkaConsumer.stop();
    await kafkaClient.disconnect();
    console.log("✅ Kafka shutdown complete");
  } catch (error) {
    console.error("❌ Error during Kafka shutdown:", error);
    throw error;
  }
}
```

### Step 11: Update Main Application Entry Point

Modify `src/main.ts` to integrate Kafka:

```typescript
import { createExpressApp } from "./express-app";
import { APP_SETTINGS } from "./shared/app-settings";
import { initializeKafka, startKafkaConsumers, shutdownKafka } from "./shared/kafka/kafka-init";

async function bootstrap() {
  try {
    // Initialize Kafka infrastructure
    if (process.env.ENABLE_KAFKA !== "false") {
      await initializeKafka();
      await startKafkaConsumers();
    }

    // Create and start Express app
    const app = createExpressApp();
    const server = app.listen(APP_SETTINGS.PORT, () => {
      console.log(`🚀 Server running on port ${APP_SETTINGS.PORT}`);
      console.log(`📝 Environment: ${APP_SETTINGS.NODE_ENV}`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n${signal} received, starting graceful shutdown...`);

      server.close(async () => {
        console.log("✅ HTTP server closed");

        try {
          await shutdownKafka();
          process.exit(0);
        } catch (error) {
          console.error("❌ Error during shutdown:", error);
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        console.error("⚠️ Forced shutdown after timeout");
        process.exit(1);
      }, 30000);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error) {
    console.error("❌ Failed to start application:", error);
    process.exit(1);
  }
}

bootstrap();
```

### Step 12: Create Health Check Endpoint

Create `src/routes/health.ts`:

```typescript
import { Router } from "express";
import { kafkaClient } from "../shared/kafka/kafka-client";

const router = Router();

router.get("/health", async (req, res) => {
  try {
    const kafkaHealthy = await kafkaClient.healthCheck();

    const health = {
      status: kafkaHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      services: {
        kafka: kafkaHealthy ? "up" : "down",
      },
    };

    const statusCode = kafkaHealthy ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
```

---

## Phase 4: Usage Examples

### Step 13: Create Example Event Handlers

Create `src/shared/kafka/handlers/user-event.handlers.ts`:

```typescript
import { EventHandler } from "../kafka-consumer.service";
import { UserCreatedEvent, UserUpdatedEvent, UserDeletedEvent } from "../event-types";

export const handleUserCreated: EventHandler<UserCreatedEvent> = async (
  event,
  context
) => {
  console.log("🎉 Processing user.created event:", event.payload);

  // Example: Send welcome email, create user profile, etc.
  try {
    // Your business logic here
    await sendWelcomeEmail(event.payload.email, event.payload.name);
    await createUserProfile(event.payload.userId);
  } catch (error) {
    console.error("Error handling user.created:", error);
    throw error; // Will trigger retry mechanism
  }
};

export const handleUserUpdated: EventHandler<UserUpdatedEvent> = async (
  event,
  context
) => {
  console.log("📝 Processing user.updated event:", event.payload);

  // Your business logic here
};

export const handleUserDeleted: EventHandler<UserDeletedEvent> = async (
  event,
  context
) => {
  console.log("🗑️ Processing user.deleted event:", event.payload);

  // Your business logic here
};

// Mock functions (replace with real implementations)
async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  console.log(`📧 Sending welcome email to ${email}`);
}

async function createUserProfile(userId: string): Promise<void> {
  console.log(`👤 Creating user profile for ${userId}`);
}
```

### Step 14: Create Example API Route with Kafka

Create `src/routes/users.ts`:

```typescript
import { Router } from "express";
import { kafkaProducer } from "../shared/kafka/kafka-producer.service";
import { KAFKA_TOPICS } from "../shared/kafka/event-types";

const router = Router();

router.post("/users", async (req, res) => {
  try {
    const { email, name } = req.body;

    // 1. Create user in database (your existing logic)
    const userId = "user-123"; // Replace with actual user creation

    // 2. Publish event to Kafka
    await kafkaProducer.publishEvent(KAFKA_TOPICS.USER_EVENTS, {
      eventType: "user.created" as const,
      version: "1.0",
      payload: {
        userId,
        email,
        name,
      },
      metadata: {
        source: "api",
        requestId: req.headers["x-request-id"],
      },
    });

    res.status(201).json({
      success: true,
      userId,
      message: "User created successfully",
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create user",
    });
  }
});

export default router;
```

### Step 15: Register Event Handlers

Update `src/shared/kafka/kafka-init.ts` to register handlers:

```typescript
import { kafkaConsumer } from "./kafka-consumer.service";
import {
  handleUserCreated,
  handleUserUpdated,
  handleUserDeleted,
} from "./handlers/user-event.handlers";

export async function startKafkaConsumers(): Promise<void> {
  try {
    console.log("🎧 Starting Kafka consumers...");

    // Register event handlers
    kafkaConsumer.registerHandler("user.created", handleUserCreated);
    kafkaConsumer.registerHandler("user.updated", handleUserUpdated);
    kafkaConsumer.registerHandler("user.deleted", handleUserDeleted);

    // Start consuming
    await kafkaConsumer.start({
      topics: [KAFKA_TOPICS.USER_EVENTS],
      fromBeginning: false,
      autoCommit: true,
      maxRetries: 3,
    });

    console.log("✅ Kafka consumers started successfully");
  } catch (error) {
    console.error("❌ Failed to start Kafka consumers:", error);
    throw error;
  }
}
```

---

## Phase 5: Testing & Monitoring

### Step 16: Add UUID Package

```bash
bun add uuid
bun add -D @types/uuid
```

### Step 17: Create Test Script

Create `scripts/test-kafka.ts`:

```typescript
import { kafkaProducer } from "../src/shared/kafka/kafka-producer.service";
import { KAFKA_TOPICS } from "../src/shared/kafka/event-types";
import { initializeKafka, shutdownKafka } from "../src/shared/kafka/kafka-init";

async function testKafka() {
  try {
    console.log("🧪 Testing Kafka setup...");

    await initializeKafka();

    // Test publishing event
    await kafkaProducer.publishEvent(KAFKA_TOPICS.USER_EVENTS, {
      eventType: "user.created" as const,
      version: "1.0",
      payload: {
        userId: "test-user-123",
        email: "test@example.com",
        name: "Test User",
      },
    });

    console.log("✅ Test event published successfully");

    await shutdownKafka();
    process.exit(0);
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

testKafka();
```

Add to `package.json`:

```json
{
  "scripts": {
    "test:kafka": "node -r esbuild-register ./scripts/test-kafka.ts"
  }
}
```

### Step 18: Add Monitoring (Optional)

Create `src/shared/kafka/kafka-metrics.ts`:

```typescript
export class KafkaMetrics {
  private static metrics = {
    messagesProduced: 0,
    messagesConsumed: 0,
    messagesFailed: 0,
    messagesRetried: 0,
  };

  static incrementProduced(): void {
    this.metrics.messagesProduced++;
  }

  static incrementConsumed(): void {
    this.metrics.messagesConsumed++;
  }

  static incrementFailed(): void {
    this.metrics.messagesFailed++;
  }

  static incrementRetried(): void {
    this.metrics.messagesRetried++;
  }

  static getMetrics() {
    return { ...this.metrics };
  }

  static reset(): void {
    this.metrics = {
      messagesProduced: 0,
      messagesConsumed: 0,
      messagesFailed: 0,
      messagesRetried: 0,
    };
  }
}
```

Add metrics endpoint to `src/routes/health.ts`:

```typescript
router.get("/metrics", (req, res) => {
  const metrics = KafkaMetrics.getMetrics();
  res.json(metrics);
});
```

---

## Phase 6: Production Deployment

### Step 19: Production Environment Variables

For production, update your `.env`:

```env
# Production Kafka Configuration
KAFKA_BROKERS=kafka-broker-1:9092,kafka-broker-2:9092,kafka-broker-3:9092
KAFKA_CLIENT_ID=express-api-prod
KAFKA_GROUP_ID=express-api-consumer-group-prod
KAFKA_CONNECTION_TIMEOUT=30000
KAFKA_REQUEST_TIMEOUT=60000
KAFKA_RETRY_ATTEMPTS=10
KAFKA_RETRY_BACKOFF_MS=500
KAFKA_LOG_LEVEL=warn

# Enable/Disable Kafka
ENABLE_KAFKA=true
```

### Step 20: Production Checklist

**Before deploying to production:**

1. ✅ **Security**
   - Use SASL/SSL authentication for Kafka brokers
   - Encrypt data in transit
   - Use separate consumer groups per environment

2. ✅ **Reliability**
   - Set up replication factor ≥ 2
   - Configure min.insync.replicas ≥ 2
   - Enable idempotent producer
   - Implement circuit breakers

3. ✅ **Monitoring**
   - Set up Kafka monitoring (Prometheus + Grafana)
   - Monitor consumer lag
   - Set up alerts for DLQ messages
   - Track message throughput

4. ✅ **Performance**
   - Tune batch size and linger.ms
   - Configure appropriate partition count
   - Monitor and optimize consumer group rebalancing
   - Use compression (GZIP/Snappy)

5. ✅ **Operations**
   - Document runbooks for common issues
   - Set up log aggregation
   - Plan for disaster recovery
   - Regular backups of critical topics

---

## Summary

You now have a production-grade Kafka setup with:

✅ **Robust Infrastructure**
- Singleton Kafka client with connection pooling
- Producer and consumer services with proper error handling
- Dead Letter Queue for failed messages
- Retry mechanisms with exponential backoff

✅ **Type Safety**
- Zod schema validation for all events
- TypeScript types for compile-time safety
- Discriminated unions for event types

✅ **Production Ready**
- Graceful shutdown handling
- Health checks and monitoring
- Docker Compose for local development
- Comprehensive error handling

✅ **Scalability**
- Support for multiple consumers
- Batch processing capabilities
- Transaction support
- Partitioning strategy

**Next Steps:**
1. Add your specific event types to `event-types.ts`
2. Implement your business logic in event handlers
3. Set up monitoring and alerting
4. Deploy to production with proper Kafka cluster

**Useful Commands:**
```bash
# Start Kafka locally
docker-compose -f docker-compose.kafka.yml up -d

# View Kafka UI
open http://localhost:8080

# Test Kafka setup
bun test:kafka

# Stop Kafka
docker-compose -f docker-compose.kafka.yml down
```