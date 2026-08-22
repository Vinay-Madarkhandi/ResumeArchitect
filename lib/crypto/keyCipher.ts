import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * AES-256-GCM encryption for the user's Gemini API key. Stored blob layout:
 * version(1B) || iv(12B) || authTag(16B) || ciphertext. The plaintext key
 * never leaves this module except for the one-time validation call made at
 * save time (see app/api/settings/gemini-key/route.ts) — it is never logged,
 * never included in a client-facing response, and never placed in a URL.
 */

const VERSION = 1;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const secret = process.env.GEMINI_KEY_ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error(
      "GEMINI_KEY_ENCRYPTION_SECRET is not set. Generate one with `openssl rand -base64 32`."
    );
  }
  const key = Buffer.from(secret, "base64");
  if (key.length !== 32) {
    throw new Error(
      "GEMINI_KEY_ENCRYPTION_SECRET must decode to exactly 32 bytes (base64 of `openssl rand -base64 32`)."
    );
  }
  return key;
}

export function encryptApiKey(plaintext: string): Buffer {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from([VERSION]), iv, authTag, ciphertext]);
}

export function decryptApiKey(blob: Buffer): string {
  const version = blob[0];
  if (version !== VERSION) {
    throw new Error(`Unsupported gemini key blob version: ${version}`);
  }
  const iv = blob.subarray(1, 1 + IV_LENGTH);
  const authTag = blob.subarray(1 + IV_LENGTH, 1 + IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = blob.subarray(1 + IV_LENGTH + AUTH_TAG_LENGTH);
  const key = getEncryptionKey();
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}

export function lastFour(plaintext: string): string {
  return plaintext.slice(-4);
}
