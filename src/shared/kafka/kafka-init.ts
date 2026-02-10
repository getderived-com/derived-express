import { kafkaClient } from "./kafka-client";
import { kafkaConsumer } from "./kafka-consumer.service";
import { KAFKA_TOPICS } from "./event-types";
import { APP_SETTINGS } from "../app-settings";

/**
 * Initialize Kafka infrastructure
 */
export async function initializeKafka(): Promise<void> {
    try {
        console.log("Initializing Kafka...");

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
            console.log(`Created topics: ${topicsToCreate.join(", ")}`);
        }

        // Initialize producer
        await kafkaClient.getProducer();

        console.log("Kafka initialized successfully");
    } catch (error) {
        console.error("Failed to initialize Kafka:", error);
        throw error;
    }
}

/**
 * Start Kafka consumers
 */
export async function startKafkaConsumers(): Promise<void> {
    try {
        console.log("Starting Kafka consumers...");

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

        console.log("Kafka consumers started successfully");
    } catch (error) {
        console.error("Failed to start Kafka consumers:", error);
        throw error;
    }
}

/**
 * Gracefully shutdown Kafka
 */
export async function shutdownKafka(): Promise<void> {
    try {
        console.log("Shutting down Kafka...");
        await kafkaConsumer.stop();
        await kafkaClient.disconnect();
        console.log("Kafka shutdown complete");
    } catch (error) {
        console.error("Error during Kafka shutdown:", error);
        throw error;
    }
}
