import { S3Client, S3ClientConfig } from "@aws-sdk/client-s3";
import { awsConfig } from "./config";

class AWSClientManager {
    private static instance: AWSClientManager;
    private s3Client: S3Client | null = null;
    private readonly MAX_ATTEMPTS = 3;
    private readonly REQUEST_TIMEOUT = 30000; // 30 seconds

    private constructor() { }

    public static getInstance(): AWSClientManager {
        if (!AWSClientManager.instance) {
            AWSClientManager.instance = new AWSClientManager();
        }
        return AWSClientManager.instance;
    }

    public getS3Client(): S3Client {
        if (!this.s3Client) {
            const config: S3ClientConfig = {
                region: awsConfig.region,
                maxAttempts: this.MAX_ATTEMPTS,
                requestHandler: {
                    requestTimeout: this.REQUEST_TIMEOUT,
                },
                // Enable HTTP keep-alive for better performance
                requestHandler: {
                    httpsAgent: {
                        keepAlive: true,
                        maxSockets: 50,
                    } as any,
                },
            };

            this.s3Client = new S3Client(config);
            this.log("info", "S3 client initialized", {
                region: awsConfig.region,
                maxAttempts: this.MAX_ATTEMPTS,
            });
        }
        return this.s3Client;
    }

    /**
     * Destroy all AWS clients (useful for graceful shutdown)
     */
    public async destroy(): Promise<void> {
        if (this.s3Client) {
            this.s3Client.destroy();
            this.s3Client = null;
            this.log("info", "S3 client destroyed");
        }
    }

    /**
     * Health check for AWS connectivity
     */
    public async healthCheck(): Promise<boolean> {
        try {
            // Simple check to see if we can create a client
            const client = this.getS3Client();
            return client !== null;
        } catch (error) {
            this.log("error", "AWS health check failed", { error });
            return false;
        }
    }

    private log(
        level: "info" | "warn" | "error",
        message: string,
        context?: Record<string, any>
    ): void {
        const logData = {
            timestamp: new Date().toISOString(),
            level,
            component: "AWSClientManager",
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

// Export singleton instance and functions
const awsClientManager = AWSClientManager.getInstance();

export const getS3Client = awsClientManager.getS3Client.bind(awsClientManager);
export const destroyAWSClients = awsClientManager.destroy.bind(awsClientManager);
export const awsHealthCheck = awsClientManager.healthCheck.bind(awsClientManager);
export { AWSClientManager, awsClientManager };
