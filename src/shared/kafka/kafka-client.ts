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
            console.log("Kafka Producer connected");
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
            console.log(`Kafka Consumer connected (group: ${consumerGroupId})`);
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
            console.log("Kafka Admin connected");
        }

        return this.admin;
    }

    public async disconnect(): Promise<void> {
        this.isShuttingDown = true;
        console.log("Disconnecting Kafka clients...");

        try {
            if (this.producer) {
                await this.producer.disconnect();
                this.producer = null;
                console.log("Kafka Producer disconnected");
            }

            for (const [groupId, consumer] of this.consumers.entries()) {
                await consumer.disconnect();
                console.log(`Kafka Consumer disconnected (group: ${groupId})`);
            }
            this.consumers.clear();

            if (this.admin) {
                await this.admin.disconnect();
                this.admin = null;
                console.log("Kafka Admin disconnected");
            }
        } catch (error) {
            console.error("Error disconnecting Kafka clients:", error);
            throw error;
        }
    }

    public async healthCheck(): Promise<boolean> {
        try {
            const admin = await this.getAdmin();
            await admin.listTopics();
            return true;
        } catch (error) {
            console.error("Kafka health check failed:", error);
            return false;
        }
    }
}

export const kafkaClient = KafkaClient.getInstance();
