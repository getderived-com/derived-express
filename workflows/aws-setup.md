Create a production-ready AWS baseline for an Express + TypeScript backend using the latest AWS SDK v3 modular packages.

Follow these strict rules:

Use AWS SDK v3 (modular packages only)

Do NOT use deprecated v2 SDK

No hardcoded region or bucket names

All configuration must come from environment variables

Use streaming APIs (no full buffer uploads)

Centralize all AWS clients

Make everything tree-shake friendly

Code must be clean and production-ready

📦 Install Latest Dependencies

Install latest stable versions:

bun add @aws-sdk/client-s3 @aws-sdk/client-secrets-manager @aws-sdk/lib-storage
bun add dotenv


Do NOT install aws-sdk v2.

🧱 1️⃣ aws-config-base
📁 Create Folder Structure
src/aws/
  config.ts
  clients.ts

📝 src/aws/config.ts

Responsibilities:

Load environment variables

Validate required AWS config

Export a typed AWS config object

Requirements:

Use dotenv for local dev

Do NOT crash if running inside AWS environment (Lambda/ECS)

Only validate required vars if explicitly needed

Expected environment variables:

AWS_REGION
AWS_ACCESS_KEY_ID (optional in prod if IAM role used)
AWS_SECRET_ACCESS_KEY (optional in prod if IAM role used)


Export:

export const awsConfig = {
  region: process.env.AWS_REGION ?? "ap-south-1",
};


Do not embed credentials manually. Let SDK auto-resolve.

📝 src/aws/clients.ts

Responsibilities:

Create centralized AWS clients

Export single instances (singleton pattern)

Use lazy initialization

Create:

import { S3Client } from "@aws-sdk/client-s3";
import { awsConfig } from "./config";

let s3Client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: awsConfig.region,
    });
  }
  return s3Client;
}


Important:

Do NOT create clients inline in other files

All AWS usage must go through this layer

🧱 2️⃣ aws-s3-base
📁 Create Folder
src/aws/s3/
  s3.service.ts

📝 src/aws/s3/s3.service.ts

Responsibilities:

Upload file using streaming

Generate signed URL

Delete object

Handle errors cleanly

Must use:

@aws-sdk/client-s3

@aws-sdk/lib-storage for streaming upload

getSignedUrl from @aws-sdk/s3-request-presigner

🔹 Required Environment Variables
AWS_S3_BUCKET

🔹 Implement Upload (Streaming)

Use Upload class from @aws-sdk/lib-storage.

Example implementation:

import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getS3Client } from "../clients";

const bucket = process.env.AWS_S3_BUCKET as string;

export async function uploadToS3(
  key: string,
  body: NodeJS.ReadableStream,
  contentType: string
) {
  const client = getS3Client();

  const upload = new Upload({
    client,
    params: {
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    },
  });

  return upload.done();
}


Important:

Do NOT use Buffer-based upload

Support streams only

🔹 Generate Signed URL
export async function generateSignedUrl(key: string, expiresIn = 3600) {
  const client = getS3Client();

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn });
}

🔹 Delete Object
export async function deleteFromS3(key: string) {
  const client = getS3Client();

  return client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}

🔒 Security Rules

Never log AWS credentials

Never hardcode bucket names

Always read from env

Keep region configurable

Support IAM role usage in production

🧠 Architectural Constraints

AWS layer must not depend on Express

S3 service must be pure and reusable

No business logic in AWS layer

No request objects passed into AWS service

Keep separation clean for testability

🧪 Optional (But Recommended)

Add helper to validate bucket existence at boot time.

📌 AI Instructions

After creating these files:

Ensure TypeScript types compile

Do not add example Express routes

Do not modify existing app structure

Only create new files

Ensure imports use relative paths

Ensure compatibility with Node 18+

✅ End State

After completion, project should have:

src/aws/config.ts
src/aws/clients.ts
src/aws/s3/s3.service.ts


All S3 usage in future features must use these exported functions.