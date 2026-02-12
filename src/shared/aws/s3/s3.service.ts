import {
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    HeadObjectCommand,
    CopyObjectCommand,
    DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getS3Client } from "../clients";

const bucket = process.env.AWS_S3_BUCKET as string;

class S3ServiceError extends Error {
    constructor(
        message: string,
        public readonly operation: string,
        public readonly key?: string,
        public readonly originalError?: unknown
    ) {
        super(message);
        this.name = "S3ServiceError";
    }
}

interface S3Metrics {
    totalUploads: number;
    totalDownloads: number;
    totalDeletes: number;
    totalFailed: number;
    lastOperationAt?: Date;
}

interface UploadOptions {
    contentType?: string;
    metadata?: Record<string, string>;
    cacheControl?: string;
    acl?: string;
    serverSideEncryption?: string;
}

interface MultipartUploadOptions extends UploadOptions {
    partSize?: number; // in bytes
    queueSize?: number;
}

class S3Service {
    private static instance: S3Service;
    private metrics: S3Metrics = {
        totalUploads: 0,
        totalDownloads: 0,
        totalDeletes: 0,
        totalFailed: 0,
    };
    private readonly DEFAULT_MULTIPART_THRESHOLD = 5 * 1024 * 1024; // 5MB
    private readonly MAX_RETRIES = 3;

    private constructor() {
        if (!bucket) {
            throw new Error("AWS_S3_BUCKET environment variable is not set");
        }
    }

    public static getInstance(): S3Service {
        if (!S3Service.instance) {
            S3Service.instance = new S3Service();
        }
        return S3Service.instance;
    }

    /**
     * Upload a file to S3 with automatic multipart upload for large files
     */
    public async uploadToS3(
        key: string,
        body: Readable | Buffer | string,
        options?: MultipartUploadOptions
    ): Promise<{ key: string; bucket: string; location: string }> {
        const startTime = Date.now();

        try {
            this.validateKey(key);
            const client = getS3Client();

            const upload = new Upload({
                client,
                params: {
                    Bucket: bucket,
                    Key: key,
                    Body: body,
                    ContentType: options?.contentType || "application/octet-stream",
                    Metadata: options?.metadata,
                    CacheControl: options?.cacheControl,
                    ACL: options?.acl as any,
                    ServerSideEncryption: options?.serverSideEncryption as any,
                },
                queueSize: options?.queueSize || 4,
                partSize: options?.partSize || this.DEFAULT_MULTIPART_THRESHOLD,
                leavePartsOnError: false,
            });

            // Track upload progress
            upload.on("httpUploadProgress", (progress) => {
                if (progress.loaded && progress.total) {
                    const percentage = ((progress.loaded / progress.total) * 100).toFixed(2);
                    this.log("info", "Upload progress", {
                        key,
                        percentage,
                        loaded: progress.loaded,
                        total: progress.total,
                    });
                }
            });

            const result = await upload.done();

            this.metrics.totalUploads++;
            this.metrics.lastOperationAt = new Date();

            const duration = Date.now() - startTime;
            this.log("info", "File uploaded successfully", {
                key,
                bucket,
                durationMs: duration,
                location: result.Location,
            });

            return {
                key,
                bucket,
                location: result.Location || `https://${bucket}.s3.amazonaws.com/${key}`,
            };
        } catch (error) {
            this.metrics.totalFailed++;
            this.log("error", "Failed to upload file", { key, bucket, error });
            throw new S3ServiceError("Failed to upload file to S3", "upload", key, error);
        }
    }

    /**
     * Generate a signed URL for temporary access to an S3 object
     */
    public async generateSignedUrl(
        key: string,
        expiresIn: number = 3600,
        operation: "get" | "put" = "get"
    ): Promise<string> {
        try {
            this.validateKey(key);
            const client = getS3Client();

            const command =
                operation === "get"
                    ? new GetObjectCommand({ Bucket: bucket, Key: key })
                    : new PutObjectCommand({ Bucket: bucket, Key: key });

            const url = await getSignedUrl(client, command, { expiresIn });

            this.log("info", "Signed URL generated", {
                key,
                operation,
                expiresIn,
            });

            return url;
        } catch (error) {
            this.log("error", "Failed to generate signed URL", { key, error });
            throw new S3ServiceError("Failed to generate signed URL", "signedUrl", key, error);
        }
    }

    /**
     * Delete a single object from S3
     */
    public async deleteFromS3(key: string): Promise<void> {
        try {
            this.validateKey(key);
            const client = getS3Client();

            await this.executeWithRetry(async () => {
                await client.send(
                    new DeleteObjectCommand({
                        Bucket: bucket,
                        Key: key,
                    })
                );
            });

            this.metrics.totalDeletes++;
            this.metrics.lastOperationAt = new Date();

            this.log("info", "File deleted successfully", { key, bucket });
        } catch (error) {
            this.metrics.totalFailed++;
            this.log("error", "Failed to delete file", { key, bucket, error });
            throw new S3ServiceError("Failed to delete file from S3", "delete", key, error);
        }
    }

    /**
     * Delete multiple objects from S3 in a single request
     */
    public async deleteBatch(keys: string[]): Promise<void> {
        if (keys.length === 0) {
            this.log("warn", "Attempted to delete empty batch");
            return;
        }

        if (keys.length > 1000) {
            throw new S3ServiceError(
                "Batch delete supports maximum 1000 keys",
                "deleteBatch"
            );
        }

        try {
            keys.forEach((key) => this.validateKey(key));
            const client = getS3Client();

            await this.executeWithRetry(async () => {
                await client.send(
                    new DeleteObjectsCommand({
                        Bucket: bucket,
                        Delete: {
                            Objects: keys.map((key) => ({ Key: key })),
                            Quiet: false,
                        },
                    })
                );
            });

            this.metrics.totalDeletes += keys.length;
            this.metrics.lastOperationAt = new Date();

            this.log("info", "Batch delete completed", {
                bucket,
                count: keys.length,
            });
        } catch (error) {
            this.metrics.totalFailed++;
            this.log("error", "Failed to delete batch", {
                bucket,
                count: keys.length,
                error,
            });
            throw new S3ServiceError("Failed to delete batch from S3", "deleteBatch", undefined, error);
        }
    }

    /**
     * Check if an object exists in S3
     */
    public async objectExists(key: string): Promise<boolean> {
        try {
            this.validateKey(key);
            const client = getS3Client();

            await client.send(
                new HeadObjectCommand({
                    Bucket: bucket,
                    Key: key,
                })
            );

            return true;
        } catch (error: any) {
            if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
                return false;
            }
            this.log("error", "Failed to check object existence", { key, error });
            throw new S3ServiceError("Failed to check object existence", "exists", key, error);
        }
    }

    /**
     * Copy an object within S3
     */
    public async copyObject(sourceKey: string, destinationKey: string): Promise<void> {
        try {
            this.validateKey(sourceKey);
            this.validateKey(destinationKey);
            const client = getS3Client();

            await this.executeWithRetry(async () => {
                await client.send(
                    new CopyObjectCommand({
                        Bucket: bucket,
                        CopySource: `${bucket}/${sourceKey}`,
                        Key: destinationKey,
                    })
                );
            });

            this.log("info", "Object copied successfully", {
                sourceKey,
                destinationKey,
                bucket,
            });
        } catch (error) {
            this.log("error", "Failed to copy object", {
                sourceKey,
                destinationKey,
                error,
            });
            throw new S3ServiceError(
                "Failed to copy object",
                "copy",
                sourceKey,
                error
            );
        }
    }

    /**
     * Get metrics for monitoring
     */
    public getMetrics(): S3Metrics {
        return { ...this.metrics };
    }

    /**
     * Execute operation with retry logic
     */
    private async executeWithRetry<T>(
        fn: () => Promise<T>,
        retries: number = this.MAX_RETRIES
    ): Promise<T> {
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error as Error;

                if (attempt < retries) {
                    const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000);
                    this.log("warn", "Retrying S3 operation", {
                        attempt: attempt + 1,
                        maxRetries: retries,
                        backoffMs,
                    });
                    await this.sleep(backoffMs);
                }
            }
        }

        throw lastError || new Error("Max retries exceeded");
    }

    private validateKey(key: string): void {
        if (!key || key.trim().length === 0) {
            throw new S3ServiceError("S3 key cannot be empty", "validation");
        }

        if (key.length > 1024) {
            throw new S3ServiceError("S3 key exceeds maximum length of 1024 characters", "validation", key);
        }

        // Check for invalid characters
        const invalidChars = /[\x00-\x1F\x7F]/;
        if (invalidChars.test(key)) {
            throw new S3ServiceError("S3 key contains invalid characters", "validation", key);
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    private log(
        level: "info" | "warn" | "error",
        message: string,
        context?: Record<string, any>
    ): void {
        const logData = {
            timestamp: new Date().toISOString(),
            level,
            component: "S3Service",
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

// Export singleton instance and individual functions for backward compatibility
const s3Service = S3Service.getInstance();

export const uploadToS3 = s3Service.uploadToS3.bind(s3Service);
export const generateSignedUrl = s3Service.generateSignedUrl.bind(s3Service);
export const deleteFromS3 = s3Service.deleteFromS3.bind(s3Service);
export const deleteBatch = s3Service.deleteBatch.bind(s3Service);
export const objectExists = s3Service.objectExists.bind(s3Service);
export const copyObject = s3Service.copyObject.bind(s3Service);
export const getS3Metrics = s3Service.getMetrics.bind(s3Service);
export { S3Service, s3Service };
