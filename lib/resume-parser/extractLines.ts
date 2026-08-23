import { extractTextItems, getDocumentProxy, type StructuredTextItem } from "unpdf";

export interface ResumeLine {
  page: number;
  y: number;
  text: string;
  maxFontSize: number;
}

const Y_TOLERANCE = 2.5;

/**
 * Groups pdf.js text fragments into reading-order lines using y-position
 * clustering (fragments sharing a baseline within Y_TOLERANCE are the same
 * line), then orders lines top-to-bottom per page. PDF's coordinate origin
 * is bottom-left, so a higher `y` is higher up the page.
 */
export async function extractResumeLines(fileBuffer: ArrayBuffer): Promise<ResumeLine[]> {
  const pdf = await getDocumentProxy(new Uint8Array(fileBuffer));
  const { items } = await extractTextItems(pdf);

  const lines: ResumeLine[] = [];

  items.forEach((pageItems, pageIndex) => {
    const clusters: StructuredTextItem[][] = [];

    for (const item of pageItems) {
      if (!item.str.trim()) continue;
      const cluster = clusters.find((c) => Math.abs(c[0].y - item.y) <= Y_TOLERANCE);
      if (cluster) {
        cluster.push(item);
      } else {
        clusters.push([item]);
      }
    }

    for (const cluster of clusters) {
      cluster.sort((a, b) => a.x - b.x);
      let text = "";
      let prevEnd: number | null = null;
      let maxFontSize = 0;
      for (const item of cluster) {
        maxFontSize = Math.max(maxFontSize, item.fontSize);
        const gap = prevEnd === null ? 0 : item.x - prevEnd;
        const avgCharWidth = item.width / Math.max(item.str.length, 1);
        if (prevEnd !== null && gap > avgCharWidth * 0.6) text += " ";
        text += item.str;
        prevEnd = item.x + item.width;
      }
      const trimmed = text.replace(/\s+/g, " ").trim();
      if (trimmed) {
        lines.push({ page: pageIndex, y: cluster[0].y, text: trimmed, maxFontSize });
      }
    }
  });

  // Reading order: page ascending, then y descending (top of page first).
  lines.sort((a, b) => (a.page !== b.page ? a.page - b.page : b.y - a.y));
  return lines;
}
