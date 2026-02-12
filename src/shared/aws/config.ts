import "dotenv/config";

interface AWSConfig {
    region: string;
    s3: {
        bucket: string;
        endpoint?: string; // For LocalStack or custom endpoints
        forcePathStyle?: boolean; // For LocalStack
    };
}

class AWSConfigManager {
    private static instance: AWSConfigManager;
    private config: AWSConfig;

    private constructor() {
        const region = process.env.AWS_REGION || "ap-south-1";
        const bucket = process.env.AWS_S3_BUCKET;
        const endpoint = process.env.AWS_S3_ENDPOINT;
        const forcePathStyle = process.env.AWS_S3_FORCE_PATH_STYLE === "true";

        // Validate required configuration
        if (!bucket && process.env.NODE_ENV === "production") {
            throw new Error("AWS_S3_BUCKET environment variable is required in production");
        }

        this.config = {
            region,
            s3: {
                bucket: bucket || "",
                endpoint,
                forcePathStyle,
            },
        };

        this.log("info", "AWS configuration initialized", {
            region: this.config.region,
            bucket: this.config.s3.bucket,
            hasEndpoint: !!this.config.s3.endpoint,
        });
    }

    public static getInstance(): AWSConfigManager {
        if (!AWSConfigManager.instance) {
            AWSConfigManager.instance = new AWSConfigManager();
        }
        return AWSConfigManager.instance;
    }

    public getConfig(): Readonly<AWSConfig> {
        return Object.freeze({ ...this.config });
    }

    public get region(): string {
        return this.config.region;
    }

    public get s3Bucket(): string {
        return this.config.s3.bucket;
    }

    public get s3Endpoint(): string | undefined {
        return this.config.s3.endpoint;
    }

    public get s3ForcePathStyle(): boolean {
        return this.config.s3.forcePathStyle || false;
    }

    private log(
        level: "info" | "warn" | "error",
        message: string,
        context?: Record<string, any>
    ): void {
        const logData = {
            timestamp: new Date().toISOString(),
            level,
            component: "AWSConfigManager",
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

// Export singleton instance and config
const awsConfigManager = AWSConfigManager.getInstance();

export const awsConfig = {
    region: awsConfigManager.region,
    s3Bucket: awsConfigManager.s3Bucket,
    s3Endpoint: awsConfigManager.s3Endpoint,
    s3ForcePathStyle: awsConfigManager.s3ForcePathStyle,
};

export { AWSConfigManager, awsConfigManager };
