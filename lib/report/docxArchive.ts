import JSZip from "jszip";
import yauzl from "yauzl";
import { InspectionLimit, MAX_DOCX_BYTES, MAX_DOCX_ENTRIES, MAX_XML_BYTES } from "./inspectLimits.ts";

/**
 * Inflates every part of a Word archive, counting the bytes actually
 * inflated rather than the sizes the archive declares, and repacks them
 * uncompressed. Readers that trust declared sizes (JSZip, mammoth) then
 * read a file that cannot expand past the budget.
 */
export async function boundedDocx(file: Uint8Array): Promise<Uint8Array> {
  const zip = await yauzl.fromBufferPromise(Buffer.from(file.buffer, file.byteOffset, file.byteLength), { autoClose: false });
  try {
    if (zip.entryCount > MAX_DOCX_ENTRIES) throw new InspectionLimit();
    const out = new JSZip();
    const names = new Set<string>();
    let total = 0;
    for await (const entry of zip.eachEntry()) {
      if (names.has(entry.fileName)) throw new Error("Duplicate Word archive part.");
      names.add(entry.fileName);
      if (entry.fileName.endsWith("/")) continue;
      const partLimit = /\.(xml|rels)$/i.test(entry.fileName) ? MAX_XML_BYTES : MAX_DOCX_BYTES;
      if (entry.uncompressedSize > partLimit || total + entry.uncompressedSize > MAX_DOCX_BYTES) throw new InspectionLimit();
      const chunks: Buffer[] = [];
      let size = 0;
      const stream = await zip.openReadStreamPromise(entry);
      try {
        for await (const chunk of stream as AsyncIterable<Buffer>) {
          size += chunk.byteLength;
          if (size > partLimit || total + size > MAX_DOCX_BYTES) throw new InspectionLimit();
          chunks.push(chunk);
        }
      } finally {
        stream.destroy();
      }
      total += size;
      out.file(entry.fileName, Buffer.concat(chunks, size));
    }
    return await out.generateAsync({ type: "uint8array", compression: "STORE" });
  } finally {
    zip.close();
  }
}
