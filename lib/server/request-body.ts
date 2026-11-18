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
