import { Kafka, logLevel, Producer, Consumer, Admin, KafkaConfig } from "kafkajs";
import { APP_SETTINGS } from "../app-settings";

enum ConnectionState {
    DISCONNECTED = "DISCONNECTED",
    CONNECTING = "CONNECTING",
    CONNECTED = "CONNECTED",
    DISCONNECTING = "DISCONNECTING",
    ERROR = "ERROR",
}

interface HealthCheckResult {
    isHealthy: boolean;
    state: ConnectionState;
    lastError?: string;
    uptime?: number;
    metrics?: {
        producerConnected: boolean;
        consumerCount: number;
        adminConnected: boolean;
    };
}

class CircuitBreaker {
    private failures = 0;
    private lastFailureTime?: number;
    private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";

    constructor(
        private readonly threshold: number = 5,
        private readonly timeout: number = 60000 // 1 minute
    ) { }

    async execute<T>(fn: () => Promise<T>): Promise<T> {
        if (this.state === "OPEN") {
            if (Date.now() - (this.lastFailureTime || 0) > this.timeout) {
                this.state = "HALF_OPEN";
            } else {
                throw new Error("Circuit breaker is OPEN");
            }
        }

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    private onSuccess(): void {
        this.failures = 0;
        this.state = "CLOSED";
    }

    private onFailure(): void {
        this.failures++;
        this.lastFailureTime = Date.now();
        if (this.failures >= this.threshold) {
            this.state = "OPEN";
            console.error(`[Kafka] Circuit breaker opened after ${this.failures} failures`);
        }
    }

    getState(): string {
        return this.state;
    }
}

class KafkaClient {
    private static instance: KafkaClient;
    private kafka: Kafka;
    private producer: Producer | null = null;
    private consumers: Map<string, Consumer> = new Map();
    private admin: Admin | null = null;
    private isShuttingDown = false;
    private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
    private circuitBreaker: CircuitBreaker;
    private startTime: number;
    private lastError?: Error;

    private constructor() {
        this.startTime = Date.now();
        this.circuitBreaker = new CircuitBreaker();

        const kafkaConfig: KafkaConfig = {
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
        };

        this.kafka = new Kafka(kafkaConfig);
        this.log("info", "Kafka client initialized", { brokers: APP_SETTINGS.KAFKA.BROKERS });
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
            return this.circuitBreaker.execute(async () => {
                try {
                    this.connectionState = ConnectionState.CONNECTING;
                    this.log("info", "Connecting Kafka producer...");

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
                    this.connectionState = ConnectionState.CONNECTED;
                    this.log("info", "Kafka Producer connected successfully");

                    return this.producer;
                } catch (error) {
                    this.connectionState = ConnectionState.ERROR;
                    this.lastError = error as Error;
                    this.log("error", "Failed to connect Kafka producer", { error });
                    throw error;
                }
            });
        }

        return this.producer;
    }

    public async getConsumer(groupId?: string): Promise<Consumer> {
        if (this.isShuttingDown) {
            throw new Error("Kafka client is shutting down");
        }

        const consumerGroupId = groupId || APP_SETTINGS.KAFKA.GROUP_ID;

        if (!this.consumers.has(consumerGroupId)) {
            return this.circuitBreaker.execute(async () => {
                try {
                    this.log("info", "Connecting Kafka consumer...", { groupId: consumerGroupId });

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
                    this.log("info", "Kafka Consumer connected successfully", { groupId: consumerGroupId });

                    return consumer;
                } catch (error) {
                    this.lastError = error as Error;
                    this.log("error", "Failed to connect Kafka consumer", { groupId: consumerGroupId, error });
                    throw error;
                }
            });
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

    public async disconnect(timeoutMs: number = 10000): Promise<void> {
        this.isShuttingDown = true;
        this.connectionState = ConnectionState.DISCONNECTING;
        this.log("info", "Disconnecting Kafka clients...", { timeout: timeoutMs });

        const disconnectPromise = (async () => {
            try {
                if (this.producer) {
                    await this.producer.disconnect();
                    this.producer = null;
                    this.log("info", "Kafka Producer disconnected");
                }

                for (const [groupId, consumer] of this.consumers.entries()) {
                    await consumer.disconnect();
                    this.log("info", "Kafka Consumer disconnected", { groupId });
                }
                this.consumers.clear();

                if (this.admin) {
                    await this.admin.disconnect();
                    this.admin = null;
                    this.log("info", "Kafka Admin disconnected");
                }

                this.connectionState = ConnectionState.DISCONNECTED;
            } catch (error) {
                this.connectionState = ConnectionState.ERROR;
                this.lastError = error as Error;
                this.log("error", "Error disconnecting Kafka clients", { error });
                throw error;
            }
        })();

        // Add timeout to prevent hanging
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("Kafka disconnect timeout")), timeoutMs);
        });

        await Promise.race([disconnectPromise, timeoutPromise]);
    }

    public async healthCheck(): Promise<HealthCheckResult> {
        try {
            const admin = await this.getAdmin();
            await admin.listTopics();

            const uptime = Date.now() - this.startTime;

            return {
                isHealthy: true,
                state: this.connectionState,
                uptime,
                metrics: {
                    producerConnected: this.producer !== null,
                    consumerCount: this.consumers.size,
                    adminConnected: this.admin !== null,
                },
            };
        } catch (error) {
            this.lastError = error as Error;
            this.log("error", "Kafka health check failed", { error });

            return {
                isHealthy: false,
                state: this.connectionState,
                lastError: error instanceof Error ? error.message : String(error),
            };
        }
    }

    public getCircuitBreakerState(): string {
        return this.circuitBreaker.getState();
    }

    private log(level: "info" | "warn" | "error", message: string, context?: Record<string, any>): void {
        const logData = {
            timestamp: new Date().toISOString(),
            level,
            component: "KafkaClient",
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

export const kafkaClient = KafkaClient.getInstance();
