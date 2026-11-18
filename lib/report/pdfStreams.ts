import { constants, createInflate } from "node:zlib";
import { InspectionLimit, MAX_PDF_INFLATED_BYTES } from "./inspectLimits.ts";

/**
 * pdf.js inflates streams into growing typed arrays outside the worker's
 * heap limit, so a small PDF can decode to gigabytes. Before pdf.js sees the
 * file, inflate every Flate stream here, counting and discarding the output,
 * and refuse what this check can't measure: encrypted streams, filters
 * named by reference, and the legacy filters that can wrap or amplify data.
 */

const UNMEASURED = /\/Encrypt\b|\/Filter\s*\d+\s+\d+\s+R\b|\/(?:LZWDecode|LZW|RunLengthDecode|RL|ASCIIHexDecode|AHx|ASCII85Decode|A85)\b/;

/** Bytes a zlib stream starting at `data[0]` inflates to, stopping once past `limit`. Not zlib data counts as 0. */
function inflatedSize(data: Uint8Array, limit: number): Promise<number> {
  return new Promise((resolve) => {
    const inflate = createInflate({ finishFlush: constants.Z_SYNC_FLUSH });
    let size = 0;
    const done = () => {
      inflate.removeAllListeners("data");
      inflate.destroy();
      resolve(size);
    };
    inflate.on("data", (chunk: Buffer) => {
      size += chunk.byteLength;
      if (size > limit) done();
    });
    inflate.once("end", done);
    inflate.once("error", done);
    inflate.end(data);
  });
}

/** Offsets where stream data begins: after the `stream` keyword and its end of line, as pdf.js reads it. */
function streamStarts(text: string): number[] {
  const starts: number[] = [];
  const eol = /\r\n|\r|\n/g;
  for (const match of text.matchAll(/(?<!end)stream/g)) {
    eol.lastIndex = match.index + 6;
    const end = eol.exec(text);
    if (!end) break;
    starts.push(end.index + end[0].length);
  }
  return starts;
}

export async function checkPdfStreams(file: Uint8Array): Promise<void> {
  const text = Buffer.from(file.buffer, file.byteOffset, file.byteLength).toString("latin1");
  const names = text.replace(/#([0-9a-f]{2})/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
  if (UNMEASURED.test(names)) throw new Error("PDF content that can't be measured before reading.");
  let total = 0;
  for (const start of streamStarts(text)) {
    total += await inflatedSize(file.subarray(start), MAX_PDF_INFLATED_BYTES - total);
    if (total > MAX_PDF_INFLATED_BYTES) throw new InspectionLimit();
  }
}
