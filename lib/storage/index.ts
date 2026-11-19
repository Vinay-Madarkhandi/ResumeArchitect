import {
  DeleteObjectsCommand, GetObjectCommand, HeadBucketCommand, ListObjectsV2Command, PutObjectCommand, S3Client, type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { RESUME_EXPORTS_BUCKET, RESUME_UPLOADS_BUCKET } from "./paths";

const clientConfig: S3ClientConfig = {
  region: process.env.AWS_REGION ?? "us-east-1",
  credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "test", secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "test" },
  forcePathStyle: true,
  maxAttempts: 2,
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
};

export const storage = new S3Client({ ...clientConfig, endpoint: process.env.S3_ENDPOINT ?? "http://localhost:14566" });

export const resumeBuckets = [RESUME_UPLOADS_BUCKET, RESUME_EXPORTS_BUCKET] as const;
type Bucket = typeof resumeBuckets[number];

function ownedKey(userId: string, key: string) {
  if (!key.startsWith(`${userId}/`) || key.split("/").some((part) => part === "." || part === "..")) {
    throw new Error("Invalid object key");
  }
  return key;
}

export async function putObject(userId: string, bucket: Bucket, path: string, body: Buffer, contentType: string) {
  await storage.send(new PutObjectCommand({ Bucket: bucket, Key: ownedKey(userId, path), Body: body, ContentType: contentType }));
}

export async function getObject(userId: string, bucket: Bucket, path: string) {
  const result = await storage.send(new GetObjectCommand({ Bucket: bucket, Key: ownedKey(userId, path) }));
  return result.Body?.transformToByteArray();
}

export async function presignObject(userId: string, bucket: Bucket, path: string) {
  const endpoint = process.env.S3_PUBLIC_ENDPOINT;
  const client = endpoint ? new S3Client({ ...clientConfig, endpoint }) : storage;
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: ownedKey(userId, path) }), { expiresIn: 300 });
}

export async function deleteObjects(userId: string, bucket: Bucket, paths: string[]) {
  for (let start = 0; start < paths.length; start += 1000) {
    const result = await storage.send(new DeleteObjectsCommand({
      Bucket: bucket, Delete: { Objects: paths.slice(start, start + 1000).map((path) => ({ Key: ownedKey(userId, path) })), Quiet: true },
    }));
    if (result.Errors?.length) throw new Error("Some objects could not be removed");
  }
}

export async function* listObjects(bucket: Bucket, prefix?: string) {
  let cursor: string | undefined;
  do {
    const result = await storage.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: cursor }));
    yield result.Contents ?? [];
    cursor = result.NextContinuationToken;
  } while (cursor);
}

export async function deleteUserObjects(userId: string) {
  for (const bucket of resumeBuckets) {
    for await (const objects of listObjects(bucket, `${userId}/`)) {
      await deleteObjects(userId, bucket, objects.flatMap(({ Key }) => Key ? [Key] : []));
    }
  }
}

export async function checkStorage(signal: AbortSignal) {
  await Promise.all(resumeBuckets.map((Bucket) => storage.send(new HeadBucketCommand({ Bucket }), { abortSignal: signal })));
}
