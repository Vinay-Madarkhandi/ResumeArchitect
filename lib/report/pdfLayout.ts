import { getResolvedPDFJS } from "unpdf";
import type { PDFPageProxy } from "unpdf/pdfjs";
import { InspectionLimit, MAX_PDF_OPERATORS, MAX_PDF_PAGES, MAX_PDF_TEXT_ITEMS } from "./inspectLimits.ts";
import { TYPED_BULLET } from "./docxLayout.ts";
import type { ResumeFileFacts } from "./report";

/**
 * Reads a PDF for the layout facts the formatting checks need. A PDF has no
 * Word tables, text boxes, or header parts, so those facts are null; what it
 * does show is where text sits (columns), which fonts set it, whether images
 * are drawn, and whether the pages carry enough selectable text to be read.
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

type PdfJs = Awaited<ReturnType<typeof getResolvedPDFJS>>;
type OperatorList = Awaited<ReturnType<PDFPageProxy["getOperatorList"]>>;

/** An image paints a unit square transformed by the PDF's current graphics state. */
function pageImages({ fnArray, argsArray }: OperatorList, { OPS, Util }: PdfJs) {
  let count = 0;
  let area = 0;
  let transform = [1, 0, 0, 1, 0, 0];
  const saved: number[][] = [];
  const addImage = (m: number[], instances = 1) => {
    area += Math.abs(m[0] * m[3] - m[1] * m[2]) * instances;
    count += instances;
  };

  fnArray.forEach((op, i) => {
    const args = argsArray[i] ?? [];
    switch (op) {
      case OPS.save:
        saved.push(transform);
        break;
      case OPS.paintFormXObjectBegin:
        saved.push(transform);
        if (args[0]) transform = Util.transform(transform, args[0]);
        break;
      case OPS.restore:
      case OPS.paintFormXObjectEnd:
        transform = saved.pop() ?? transform;
        break;
      case OPS.transform:
        transform = Util.transform(transform, args);
        break;
      case OPS.paintImageXObject:
      case OPS.paintInlineImageXObject:
      case OPS.paintImageMaskXObject:
        addImage(transform);
        break;
      case OPS.paintImageXObjectRepeat: {
        const [, scaleX, skewX, skewY, scaleY, positions] = args;
        addImage(Util.transform(transform, [scaleX, skewX, skewY, scaleY, 0, 0]), positions.length / 2);
        break;
      }
      case OPS.paintInlineImageXObjectGroup:
        for (const item of args[1]) addImage(Util.transform(transform, item.transform));
        break;
    }
  });
  return { count, area };
}

const DOMINANT_IMAGE_FRACTION = 0.35;
const SCAN_TEXT_FRACTION = 0.008;

export async function readPdfLayout(file: Uint8Array): Promise<Extract<ResumeFileFacts, { format: "pdf" }>> {
  const pdfjs = await getResolvedPDFJS();
  const task = pdfjs.getDocument({ data: file, stopAtErrors: true, maxImageSize: 16_000_000, useSystemFonts: true });
  try {
    const pdf = await task.promise;
    if (pdf.numPages > MAX_PDF_PAGES) throw new InspectionLimit();

    let operators = 0;
    let textItems = 0;
    let images = 0;
    let columns = 1;
    let textPages = 0;
    let scannedPages = 0;
    const fonts = new Set<string>();
    const bullets = new Set<string>();

    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const ops = await page.getOperatorList();
      operators += ops.fnArray.length;
      if (operators > MAX_PDF_OPERATORS) throw new InspectionLimit();
      const raster = pageImages(ops, pdfjs);
      images += raster.count;

      const content = await page.getTextContent();
      textItems += content.items.length;
      if (textItems > MAX_PDF_TEXT_ITEMS) throw new InspectionLimit();
      const items = (content.items as PdfTextItem[]).filter((i) => typeof i.str === "string" && i.str.trim());
      for (const item of items) {
        const font = page.commonObjs.has(item.fontName) ? (page.commonObjs.get(item.fontName) as { name?: string }).name : undefined;
        const family = font ? fontFamily(font) : "";
        if (family && !SYMBOL_FONTS.test(family)) fonts.add(family);
      }

      const placed = items.map((i) => ({
        str: i.str,
        x: i.transform[4],
        y: i.transform[5],
        width: i.width,
        size: Math.hypot(i.transform[2], i.transform[3]),
      }));
      const [left, bottom, right, top] = page.view;
      const pageArea = (right - left) * (top - bottom);
      const textArea = placed.reduce((area, item) => {
        if (!/[\p{L}\p{N}]/u.test(item.str)) return area;
        const width = Math.max(0, Math.min(item.x + item.width, right) - Math.max(item.x, left));
        const height = Math.max(0, Math.min(item.y + item.size, top) - Math.max(item.y, bottom));
        return area + width * height;
      }, 0);
      if (textArea > 0) textPages++;
      if (raster.count > 0 && (textArea === 0 ||
          (raster.area / pageArea >= DOMINANT_IMAGE_FRACTION && textArea / pageArea < SCAN_TEXT_FRACTION))) scannedPages++;

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
      hasTextLayer: textPages > 0 && scannedPages === 0,
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
