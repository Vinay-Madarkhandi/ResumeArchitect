import { getResolvedPDFJS } from "unpdf";
import { InspectionLimit, MAX_PDF_PAGES, inspectWithinBudget } from "./inspectBudget";
import { TYPED_BULLET } from "./inspectDocx";
import type { ResumeFileFacts } from "./report";

/**
 * Reads a PDF for the layout facts the formatting checks need. A PDF has no
 * Word tables, text boxes, or header parts, so those facts are null; what it
 * does show is where text sits (columns), which fonts set it, whether images
 * are drawn, and whether there is any text at all (a scanned page has none).
 */

/** A run of text on one baseline with no wide gap inside it. */
export interface Segment {
  x: number;
  end: number;
  y: number;
  text: string;
}

interface PlacedItem {
  str: string;
  x: number;
  y: number;
  width: number;
  size: number;
}

const SAME_LINE = 2;

function segmentsOf(items: PlacedItem[]): Segment[] {
  const rows: PlacedItem[][] = [];
  for (const item of items) {
    const row = rows.find((r) => Math.abs(r[0].y - item.y) <= SAME_LINE);
    if (row) row.push(item);
    else rows.push([item]);
  }
  const segments: Segment[] = [];
  for (const row of rows) {
    row.sort((a, b) => a.x - b.x);
    let current: Segment | null = null;
    for (const item of row) {
      // A gap wider than a character or two is a tab stop or a column gutter, not a space.
      const gap = current ? item.x - current.end : Infinity;
      if (current && gap <= Math.max(item.size, 8)) {
        current.text += (gap > 1 ? " " : "") + item.str;
        current.end = Math.max(current.end, item.x + item.width);
      } else {
        current = { x: item.x, end: item.x + item.width, y: item.y, text: item.str };
        segments.push(current);
      }
    }
  }
  return segments;
}

const START_TOLERANCE = 6;

/**
 * Counts text columns by clustering where lines start. A column is a group
 * of left edges shared by many lines down a large part of the page, with a
 * gutter that lines to its left don't cross. Right-aligned dates start at
 * varying x, and full-width bullets cross any would-be gutter, so a single
 * column with dates on the right still reads as one.
 */
export function countColumns(segments: Segment[], pageWidth: number): number {
  if (segments.length < 8) return 1;
  const sorted = [...segments].sort((a, b) => a.x - b.x);
  const clusters: Segment[][] = [];
  for (const seg of sorted) {
    const last = clusters[clusters.length - 1];
    if (last && seg.x - last[last.length - 1].x <= START_TOLERANCE) last.push(seg);
    else clusters.push([seg]);
  }
  const minLines = Math.max(4, segments.length * 0.15);
  const groups: Segment[][] = [];
  for (const cluster of clusters.filter((c) => c.length >= minLines)) {
    const last = groups[groups.length - 1];
    // Starts within ~15% of the page width are indents (bullets, sub-lines), not a new column.
    if (last && cluster[0].x - last[0].x < pageWidth * 0.15) last.push(...cluster);
    else groups.push(cluster);
  }

  const top = Math.max(...segments.map((s) => s.y));
  const bottom = Math.min(...segments.map((s) => s.y));
  let columns = 1;
  for (const group of groups.slice(1)) {
    const edge = Math.min(...group.map((s) => s.x));
    const high = Math.max(...group.map((s) => s.y));
    const low = Math.min(...group.map((s) => s.y));
    if (high - low < (top - bottom) * 0.3) continue;
    const beside = segments.filter((s) => s.x < edge - START_TOLERANCE && s.y >= low - SAME_LINE && s.y <= high + SAME_LINE);
    const crossing = beside.filter((s) => s.end > edge + SAME_LINE);
    if (beside.length >= 4 && crossing.length / beside.length < 0.1) columns++;
  }
  return columns;
}

const SYMBOL_FONTS = /^(symbol|zapf ?dingbats|wingdings( ?\d)?|webdings)$/i;

/** "ABCDEF+Calibri-Bold" → "Calibri"; "TimesNewRomanPSMT" → "Times New Roman". */
export function fontFamily(postscriptName: string): string {
  return postscriptName
    .replace(/^[A-Z]{6}\+/, "")
    .split(/[-,]/)[0]
    .replace(/(PSMT|PS|MT)$/, "")
    .replace(/\d+$/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
}

interface PdfTextItem {
  str: string;
  transform: number[];
  width: number;
  fontName: string;
}

export function inspectPdf(file: ArrayBuffer | Uint8Array) {
  return inspectWithinBudget("pdf", file);
}

export async function readPdfLayout(file: Uint8Array): Promise<Extract<ResumeFileFacts, { format: "pdf" }>> {
  const { getDocument, OPS } = await getResolvedPDFJS();
  const task = getDocument({ data: file, stopAtErrors: true, maxImageSize: 16_000_000, useSystemFonts: true });
  try {
    const pdf = await task.promise;
    if (pdf.numPages > MAX_PDF_PAGES) throw new InspectionLimit();
    const imageOps = new Set<number>([OPS.paintImageXObject, OPS.paintInlineImageXObject, OPS.paintImageXObjectRepeat]);

    let images = 0;
    let columns = 1;
    let characters = 0;
    const fonts = new Set<string>();
    const bullets = new Set<string>();

    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const ops = await page.getOperatorList();
      images += ops.fnArray.filter((fn) => imageOps.has(fn)).length;

      const content = await page.getTextContent();
      const items = (content.items as PdfTextItem[]).filter((i) => typeof i.str === "string" && i.str.trim());
      for (const item of items) {
        characters += item.str.replace(/\s/g, "").length;
        const font = page.commonObjs.has(item.fontName) ? (page.commonObjs.get(item.fontName) as { name?: string }).name : undefined;
        const family = font ? fontFamily(font) : "";
        if (family && !SYMBOL_FONTS.test(family)) fonts.add(family);
      }

      const placed = items.map((i) => ({
        str: i.str,
        x: i.transform[4],
        y: i.transform[5],
        width: i.width,
        size: Math.hypot(i.transform[2], i.transform[3]) || 10,
      }));
      const segments = segmentsOf(placed);
      columns = Math.max(columns, countColumns(segments, page.view[2] - page.view[0]));
      for (const seg of segments) {
        const typed = TYPED_BULLET.exec(seg.text);
        if (typed) bullets.add(typed[1]);
      }
      page.cleanup();
    }

    return {
      format: "pdf",
      hasTextLayer: characters >= 20,
      tables: null,
      images,
      textBoxes: null,
      columns,
      headerText: null,
      footerText: null,
      fonts: [...fonts],
      bulletChars: [...bullets],
    };
  } finally {
    await task.destroy();
  }
}
