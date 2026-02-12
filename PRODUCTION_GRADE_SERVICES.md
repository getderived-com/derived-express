# Production-Grade Kafka & AWS Services

This document outlines the production-grade improvements made to the Kafka and AWS services.

## 🚀 Kafka Improvements

### **Kafka Client (`kafka-client.ts`)**

#### New Features:
1. **Circuit Breaker Pattern**
   - Prevents cascading failures by opening circuit after 5 consecutive failures
   - Automatically attempts recovery after 60 seconds
   - Protects against overwhelming a failing Kafka cluster

2. **Connection State Tracking**
   - Tracks connection states: DISCONNECTED, CONNECTING, CONNECTED, DISCONNECTING, ERROR
   - Provides visibility into connection lifecycle

3. **Enhanced Health Checks**
   - Returns detailed health status including:
     - Connection state
     - Uptime
     - Producer/consumer/admin connection status
     - Last error message

4. **Structured Logging**
   - JSON-formatted logs with timestamps and context
   - Consistent log format across all operations
   - Easy integration with log aggregation tools (ELK, Datadog, etc.)

5. **Graceful Shutdown with Timeout**
   - Prevents hanging during shutdown
   - Configurable timeout (default: 10 seconds)
   - Ensures clean resource cleanup

#### Usage Example:
```typescript
import { kafkaClient } from './shared/kafka';

// Health check
const health = await kafkaClient.healthCheck();
console.log(health);
// {
//   isHealthy: true,
//   state: "CONNECTED",
//   uptime: 123456,
//   metrics: {
//     producerConnected: true,
//     consumerCount: 2,
//     adminConnected: true
//   }
// }

// Circuit breaker state
const cbState = kafkaClient.getCircuitBreakerState();
console.log(cbState); // "CLOSED", "OPEN", or "HALF_OPEN"

// Graceful shutdown with timeout
await kafkaClient.disconnect(5000); // 5 second timeout
```

---

### **Kafka Producer (`kafka-producer.service.ts`)**

#### New Features:
1. **Metrics Tracking**
   - Total published events
   - Total failed events
   - Average batch size
   - Last published timestamp

2. **Custom Error Types**
   - `KafkaProducerError` with topic and original error context
   - Better error debugging and monitoring

3. **Batch Size Validation**
   - Maximum batch size of 1000 events
   - Prevents overwhelming Kafka brokers

4. **Performance Monitoring**
   - Tracks operation duration
   - Logs processing time for each publish operation

5. **Structured Logging**
   - Detailed context for all operations
   - Easy debugging and monitoring

#### Usage Example:
```typescript
import { kafkaProducer } from './shared/kafka';

// Publish single event
await kafkaProducer.publishEvent('user.events', {
  eventType: 'user.created',
  version: '1.0',
  payload: { userId: '123', email: 'user@example.com', name: 'John' }
});

// Publish batch
await kafkaProducer.publishBatch('order.events', [
  { eventType: 'order.created', version: '1.0', payload: { orderId: '1' } },
  { eventType: 'order.created', version: '1.0', payload: { orderId: '2' } }
]);

// Get metrics
const metrics = kafkaProducer.getMetrics();
console.log(metrics);
// {
//   totalPublished: 150,
//   totalFailed: 2,
//   lastPublishedAt: Date,
//   averageBatchSize: 25.5
// }
```

---

### **Kafka Consumer (`kafka-consumer.service.ts`)**

#### New Features:
1. **Pause/Resume Functionality**
   - Handle backpressure by pausing consumption
   - Resume when ready to process more messages
   - Prevents overwhelming downstream services

2. **Metrics Tracking**
   - Total processed events
   - Total failed events
   - Total retries
   - Average processing time

3. **Configurable DLQ Behavior**
   - Option to disable DLQ per consumer
   - Useful for development/testing

4. **Processing Time Tracking**
   - Monitors average processing time
   - Helps identify performance bottlenecks

5. **Enhanced Retry Logging**
   - Detailed retry context
   - Backoff time tracking

#### Usage Example:
```typescript
import { kafkaConsumer } from './shared/kafka';

// Register handlers
kafkaConsumer.registerHandler('user.created', async (event, context) => {
  console.log('Processing user created:', event.payload);
});

// Start consumer
await kafkaConsumer.start({
  topics: ['user.events', 'order.events'],
  fromBeginning: false,
  autoCommit: true,
  maxRetries: 3,
  enableDLQ: true // Can be disabled for testing
});

// Pause consumption (e.g., during high load)
kafkaConsumer.pause();

// Resume consumption
kafkaConsumer.resume();

// Get metrics
const metrics = kafkaConsumer.getMetrics();
console.log(metrics);
// {
//   totalProcessed: 1000,
//   totalFailed: 5,
//   totalRetries: 15,
//   lastProcessedAt: Date,
//   averageProcessingTime: 45.2
// }

// Check status
console.log(kafkaConsumer.isConsumerRunning()); // true
console.log(kafkaConsumer.isConsumerPaused()); // false
```

---

## ☁️ AWS S3 Improvements

### **S3 Service (`s3/s3.service.ts`)**

#### New Features:
1. **Multipart Upload Support**
   - Automatic multipart upload for files > 5MB
   - Configurable part size and queue size
   - Progress tracking with events

2. **Retry Logic with Exponential Backoff**
   - Automatic retry on transient failures
   - Maximum 3 retries with exponential backoff
   - Prevents overwhelming S3 during issues

3. **Comprehensive Operations**
   - Upload with options (metadata, cache control, ACL, encryption)
   - Generate signed URLs (GET and PUT)
   - Delete single or batch objects
   - Check object existence
   - Copy objects within bucket

4. **Metrics Tracking**
   - Total uploads, downloads, deletes
   - Total failed operations
   - Last operation timestamp

5. **Input Validation**
   - Key length validation (max 1024 characters)
   - Invalid character detection
   - Empty key prevention

6. **Custom Error Types**
   - `S3ServiceError` with operation context
   - Better error debugging

7. **Structured Logging**
   - JSON-formatted logs
   - Operation context and duration tracking

#### Usage Example:
```typescript
import { uploadToS3, generateSignedUrl, deleteFromS3, deleteBatch, objectExists, copyObject, getS3Metrics } from './shared/aws';

// Upload file with options
const result = await uploadToS3('uploads/file.pdf', fileBuffer, {
  contentType: 'application/pdf',
  metadata: { userId: '123', uploadedBy: 'admin' },
  cacheControl: 'max-age=31536000',
  serverSideEncryption: 'AES256'
});
console.log(result);
// {
//   key: 'uploads/file.pdf',
//   bucket: 'my-bucket',
//   location: 'https://my-bucket.s3.amazonaws.com/uploads/file.pdf'
// }

// Generate signed URL for download
const downloadUrl = await generateSignedUrl('uploads/file.pdf', 3600, 'get');

// Generate signed URL for upload
const uploadUrl = await generateSignedUrl('uploads/new-file.pdf', 3600, 'put');

// Check if object exists
const exists = await objectExists('uploads/file.pdf');

// Copy object
await copyObject('uploads/file.pdf', 'backups/file.pdf');

// Delete single file
await deleteFromS3('uploads/file.pdf');

// Delete multiple files (batch)
await deleteBatch(['uploads/file1.pdf', 'uploads/file2.pdf']);

// Get metrics
const metrics = getS3Metrics();
console.log(metrics);
// {
//   totalUploads: 50,
//   totalDownloads: 0,
//   totalDeletes: 10,
//   totalFailed: 2,
//   lastOperationAt: Date
// }
```

---

### **AWS Client Manager (`clients.ts`)**

#### New Features:
1. **Connection Pooling**
   - HTTP keep-alive enabled
   - Maximum 50 concurrent sockets
   - Better performance for multiple requests

2. **Configurable Retry Logic**
   - Maximum 3 retry attempts
   - 30-second request timeout

3. **Graceful Shutdown**
   - Clean client destruction
   - Resource cleanup

4. **Health Check**
   - Verify AWS client availability

#### Usage Example:
```typescript
import { getS3Client, destroyAWSClients, awsHealthCheck } from './shared/aws';

// Get S3 client (singleton)
const s3Client = getS3Client();

// Health check
const isHealthy = await awsHealthCheck();

// Graceful shutdown
await destroyAWSClients();
```

---

### **AWS Config Manager (`config.ts`)**

#### New Features:
1. **Environment Validation**
   - Required config validation in production
   - Clear error messages for missing config

2. **LocalStack Support**
   - Custom endpoint configuration
   - Force path style option

3. **Immutable Configuration**
   - Frozen config objects
   - Prevents accidental modifications

4. **Structured Logging**
   - Configuration initialization logging

#### Configuration:
```env
# Required
AWS_REGION=ap-south-1
AWS_S3_BUCKET=my-bucket

# Optional (for LocalStack)
AWS_S3_ENDPOINT=http://localhost:4566
AWS_S3_FORCE_PATH_STYLE=true
```

---

## 📊 Monitoring & Observability

### Structured Logging Format
All services use consistent JSON logging:

```json
{
  "timestamp": "2026-02-11T12:00:00.000Z",
  "level": "info",
  "component": "KafkaProducer",
  "message": "Event published successfully",
  "topic": "user.events",
  "eventId": "uuid",
  "eventType": "user.created",
  "durationMs": 45
}
```

### Metrics Collection
All services expose metrics via `getMetrics()`:

```typescript
// Kafka Producer Metrics
const kafkaMetrics = kafkaProducer.getMetrics();

// Kafka Consumer Metrics
const consumerMetrics = kafkaConsumer.getMetrics();

// S3 Metrics
const s3Metrics = getS3Metrics();

// Kafka Health
const kafkaHealth = await kafkaClient.healthCheck();
```

---

## 🔒 Error Handling

### Custom Error Types
- `KafkaProducerError`: Kafka producer-specific errors
- `S3ServiceError`: S3 operation errors

All errors include:
- Operation context
- Original error
- Relevant metadata (topic, key, etc.)

### Retry Strategies
- **Kafka**: Exponential backoff (1s, 2s, 4s, 8s, max 30s)
- **S3**: Exponential backoff (1s, 2s, 4s, max 10s)
- **Circuit Breaker**: Opens after 5 failures, recovers after 60s

---

## 🚦 Best Practices

### Kafka
1. Always register handlers before starting consumers
2. Use pause/resume for backpressure handling
3. Monitor metrics regularly
4. Enable DLQ in production
5. Use transactional publishing for critical events

### AWS S3
1. Use multipart upload for files > 5MB
2. Set appropriate cache control headers
3. Enable server-side encryption in production
4. Use signed URLs for temporary access
5. Batch delete operations when possible

### General
1. Monitor structured logs with log aggregation tools
2. Set up alerts on error metrics
3. Implement graceful shutdown in your application
4. Use health checks for readiness probes
5. Track and analyze performance metrics

---

## 🔄 Migration Guide

### Kafka
No breaking changes - all existing code continues to work. New features are opt-in.

### AWS S3
**Breaking Change**: `uploadToS3` signature changed:

**Before:**
```typescript
uploadToS3(key: string, body: Readable, contentType: string)
```

**After:**
```typescript
uploadToS3(key: string, body: Readable | Buffer | string, options?: {
  contentType?: string;
  metadata?: Record<string, string>;
  // ... more options
})
```

**Migration:**
```typescript
// Old code
await uploadToS3('file.pdf', stream, 'application/pdf');

// New code
await uploadToS3('file.pdf', stream, { contentType: 'application/pdf' });
```

---

## 📝 Environment Variables

### Kafka (existing)
```env
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=express-api
KAFKA_GROUP_ID=express-api-consumer-group
KAFKA_CONNECTION_TIMEOUT=10000
KAFKA_REQUEST_TIMEOUT=30000
KAFKA_RETRY_ATTEMPTS=5
KAFKA_RETRY_BACKOFF_MS=300
KAFKA_LOG_LEVEL=info
ENABLE_KAFKA=true
```

### AWS (new/updated)
```env
# Required
AWS_REGION=ap-south-1
AWS_S3_BUCKET=my-bucket

# Optional (for LocalStack/development)
AWS_S3_ENDPOINT=http://localhost:4566
AWS_S3_FORCE_PATH_STYLE=true
```

---

## 🎯 Summary

### Kafka Improvements
✅ Circuit breaker pattern for resilience  
✅ Structured logging for observability  
✅ Metrics tracking for monitoring  
✅ Pause/resume for backpressure  
✅ Enhanced health checks  
✅ Graceful shutdown with timeout  
✅ Better error handling  

### AWS S3 Improvements
✅ Multipart upload support  
✅ Retry logic with exponential backoff  
✅ Comprehensive operations (batch delete, copy, exists)  
✅ Metrics tracking  
✅ Input validation  
✅ Structured logging  
✅ Connection pooling  
✅ LocalStack support  

Both modules are now **production-ready** with enterprise-grade features for reliability, observability, and performance.
