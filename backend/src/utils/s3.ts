import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import { config } from '../config/env';

const s3 = new S3Client({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
});

const BUCKET = config.aws.s3Bucket;

/** Returns true if S3 is configured (bucket + credentials present) */
export function isS3Enabled(): boolean {
  return !!(BUCKET && config.aws.accessKeyId && config.aws.secretAccessKey);
}

/**
 * Upload a local file to S3 and delete the local copy.
 * @returns The S3 key (used as the stored path in DB)
 */
export async function uploadToS3(localPath: string, s3Key: string, contentType: string): Promise<string> {
  const body = fs.readFileSync(localPath);

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: s3Key,
    Body: body,
    ContentType: contentType,
  }));

  // Remove local temp file after successful upload
  fs.unlink(localPath, () => {});

  return s3Key;
}

/**
 * Generate a pre-signed URL for downloading/previewing a file from S3.
 * @param expiresInSeconds Default 5 minutes
 */
export async function getS3SignedUrl(s3Key: string, expiresInSeconds = 300): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: s3Key });
  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

/**
 * Stream an S3 object directly into an Express response.
 */
export async function streamS3ToResponse(s3Key: string, res: import('express').Response): Promise<void> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: s3Key });
  const s3Res = await s3.send(command);
  const stream = s3Res.Body as NodeJS.ReadableStream;
  stream.pipe(res);
}

/**
 * Delete a file from S3 (best-effort, no throw).
 */
export async function deleteFromS3(s3Key: string): Promise<void> {
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: s3Key }));
  } catch (err: any) {
    console.error('[S3] Delete error:', err.message);
  }
}
