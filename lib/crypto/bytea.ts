/**
 * Postgres/PostgREST represent `bytea` columns as hex-encoded text in the
 * form "\x48656c6c6f" (a literal backslash-x prefix). Every read or write of
 * profiles.gemini_key_ciphertext through supabase-js goes through these two
 * functions so the encoding is handled in exactly one place.
 */
export function bufferToPgBytea(buf: Buffer): string {
  return `\\x${buf.toString("hex")}`;
}

export function pgByteaToBuffer(value: string): Buffer {
  const hex = value.startsWith("\\x") ? value.slice(2) : value;
  return Buffer.from(hex, "hex");
}
