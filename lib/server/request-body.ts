import { NextResponse } from "next/server";
export class BodyTooLarge extends Error {}

/** The request body, refused by its declared length or once it streams past `maxBytes`, so an oversize body is never held whole. */
async function readBytes(request: Request, maxBytes: number): Promise<Uint8Array[]> {
  if (Number(request.headers.get("content-length")) > maxBytes) throw new BodyTooLarge();
  if (!request.body) return [];

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return chunks;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new BodyTooLarge();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
}

export async function readText(request: Request, maxBytes: number) {
  return new TextDecoder().decode(Buffer.concat(await readBytes(request, maxBytes)));
}

/** Multipart or urlencoded form data, read within `maxBytes`. Null when the body isn't a form. */
export async function readFormData(request: Request, maxBytes: number): Promise<FormData | null> {
  const body = Buffer.concat(await readBytes(request, maxBytes));
  const contentType = request.headers.get("content-type") ?? "";
  return new Response(body, { headers: { "content-type": contentType } }).formData().catch(() => null);
}

export const MAX_JSON_BYTES = 2 * 1024 * 1024;

/** Reads a JSON body within `maxBytes`, returning 413 if the payload is too large. */
export async function readJson<T = unknown>(
  request: Request,
  maxBytes: number = MAX_JSON_BYTES,
): Promise<{ ok: true; data: T | null } | { ok: false; response: NextResponse }> {
  try {
    const text = await readText(request, maxBytes);
    if (!text.trim()) return { ok: true, data: null };
    try {
      return { ok: true, data: JSON.parse(text) as T };
    } catch {
      return { ok: true, data: null };
    }
  } catch (error) {
    if (error instanceof BodyTooLarge) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "That request is over the size limit.", code: "payload_too_large" },
          { status: 413 },
        ),
      };
    }
    throw error;
  }
}
