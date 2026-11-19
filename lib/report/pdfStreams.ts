import { constants, createInflate } from "node:zlib";
import { InspectionLimit, MAX_PDF_INFLATED_BYTES, MAX_PDF_STREAMS } from "./inspectLimits.ts";

/**
 * pdf.js inflates streams into growing typed arrays outside the worker's
 * heap limit, so a small PDF can decode to gigabytes. Before pdf.js sees the
 * file, inflate every Flate stream here across all filter stages, counting
 * output against the total budget, and refuse what this check can't measure:
 * encrypted streams, filters named by reference, legacy filters, and filter
 * chains longer than 2.
 */

const UNMEASURED = /\/Encrypt\b|\/Filter\s*\d+\s+\d+\s+R\b|\/(?:LZWDecode|LZW|RunLengthDecode|RL|ASCIIHexDecode|AHx|ASCII85Decode|A85|CCITTFaxDecode|CCF|JBIG2Decode|DCTDecode|DCT|JPXDecode|Crypt)\b/;
const SUPPORTED_FILTERS = new Set(["FlateDecode", "Flate"]);

/**
 * Inflates a zlib stream, collecting chunks if `keepOutput` is true.
 * Aborts and rejects if the accumulated bytes across all streams and stages
 * exceeds `maxAllowed`.
 */
function inflateStage(
  data: Uint8Array,
  maxAllowed: number,
  keepOutput: boolean,
): Promise<{ size: number; output?: Buffer }> {
  return new Promise((resolve, reject) => {
    if (maxAllowed <= 0) return reject(new InspectionLimit());
    const inflate = createInflate({ finishFlush: constants.Z_SYNC_FLUSH });
    let size = 0;
    const chunks: Buffer[] = [];
    let completed = false;

    const cleanup = () => {
      inflate.removeAllListeners();
      inflate.destroy();
    };

    inflate.on("data", (chunk: Buffer) => {
      size += chunk.byteLength;
      if (size > maxAllowed) {
        cleanup();
        reject(new InspectionLimit());
        return;
      }
      if (keepOutput) chunks.push(chunk);
    });

    inflate.once("end", () => {
      if (completed) return;
      completed = true;
      cleanup();
      resolve({ size, output: keepOutput ? Buffer.concat(chunks) : undefined });
    });

    inflate.once("error", () => {
      if (completed) return;
      completed = true;
      cleanup();
      // Invalid zlib stream or non-zlib data counts as 0 bytes.
      resolve({ size: 0 });
    });

    inflate.end(data);
  });
}

/** Parses filter names from a stream dictionary's /Filter entry. */
function parseFilters(dict: string): string[] | null {
  const norm = dict.replace(/#([0-9a-f]{2})/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
  if (/\/Filter\s*\d+\s+\d+\s+R\b/.test(norm)) return null; // indirect reference
  const arrayMatch = /\/Filter\s*\[([^\]]*)\]/.exec(norm);
  if (arrayMatch) {
    const filters = arrayMatch[1].match(/\/([A-Za-z0-9_]+)/g)?.map((f) => f.slice(1)) ?? [];
    return filters;
  }
  const singleMatch = /\/Filter\s*\/([A-Za-z0-9_]+)/.exec(norm);
  if (singleMatch) return [singleMatch[1]];
  return [];
}

export async function checkPdfStreams(file: Uint8Array): Promise<void> {
  const text = Buffer.from(file.buffer, file.byteOffset, file.byteLength).toString("latin1");
  const names = text.replace(/#([0-9a-f]{2})/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
  if (UNMEASURED.test(names)) throw new Error("PDF content that can't be measured before reading.");

  let totalInflated = 0;
  let streamCount = 0;
  let idx = 0;

  // Scan linearly for the stream keyword to avoid regex token-burn
  while ((idx = text.indexOf("stream", idx)) !== -1) {
    // Skip endstream
    if (idx >= 3 && text.slice(idx - 3, idx) === "end") {
      idx += 6;
      continue;
    }

    streamCount++;
    if (streamCount > MAX_PDF_STREAMS) {
      throw new InspectionLimit();
    }

    // Determine where stream data starts after end of line (\r\n, \n, or \r)
    let start = idx + 6;
    if (text[start] === "\r" && text[start + 1] === "\n") {
      start += 2;
    } else if (text[start] === "\n" || text[start] === "\r") {
      start += 1;
    }

    // Find the enclosing dictionary before `stream`
    const dictEnd = text.lastIndexOf(">>", idx);
    const dictStart = dictEnd !== -1 ? text.lastIndexOf("<<", dictEnd) : -1;
    const dictText = dictStart !== -1 ? text.slice(dictStart, dictEnd + 2) : "";

    const filters = parseFilters(dictText);
    if (filters === null) {
      throw new Error("PDF content that can't be measured before reading.");
    }

    if (filters.length > 2) {
      throw new Error("PDF content with filter chain too complex to measure.");
    }

    for (const f of filters) {
      if (!SUPPORTED_FILTERS.has(f)) {
        throw new Error("PDF content that can't be measured before reading.");
      }
    }

    if (filters.length > 0) {
      // Determine stream slice
      let streamBytes = file.subarray(start);
      const lenMatch = /\/Length\s+(\d+)\b/.exec(dictText);
      if (lenMatch) {
        const len = parseInt(lenMatch[1], 10);
        if (len > 0 && start + len <= file.byteLength) {
          streamBytes = file.subarray(start, start + len);
        }
      }

      let currentData: Uint8Array = streamBytes;
      for (let stage = 0; stage < filters.length; stage++) {
        const remainingBudget = MAX_PDF_INFLATED_BYTES - totalInflated;
        const isIntermediate = stage < filters.length - 1;
        const { size, output } = await inflateStage(currentData, remainingBudget, isIntermediate);
        totalInflated += size;
        if (totalInflated > MAX_PDF_INFLATED_BYTES) {
          throw new InspectionLimit();
        }
        if (isIntermediate) {
          if (!output || output.length === 0) break;
          currentData = output;
        }
      }
    }

    idx = start;
  }
}
