import { getDocumentProxy } from "unpdf";
import type { BlockNode, DocumentContent, InlineNode, ListItemNode, TextNode } from "@/lib/schemas/document";

interface TextPiece {
  str: string;
  x: number;
  y: number;
  w: number;
  size: number;
  bold: boolean;
  italic: boolean;
  link?: string;
}

interface RawLine {
  y: number;
  maxSize: number;
  pieces: TextPiece[];
  fullText: string;
}

const SECTION_RE =
  /^(professional\s+summary|summary|profile|work\s+experience|experience|employment|projects|technical\s+skills|skills|education|certifications?|awards|publications|leadership|languages|interests)$/i;

const BULLET_RE = /^[●•▪◦‣○■◆➢►✓–-]\s*/;

const SKILLS_KEY_RE =
  /^(languages|backend\s+frameworks|frontend\s+frameworks|frameworks|databases|security\s*(&|\+)?\s*auth|tools\s*(&|\+)?\s*technologies|tools|technologies|core\s+concepts|devops|cloud|libraries):/i;

function cleanPieces(pieces: TextPiece[]): InlineNode[] {
  const nodes: InlineNode[] = [];

  for (const p of pieces) {
    if (!p.str) continue;

    // Separate leading/trailing spaces from marked text so strong/em tags wrap only words
    let leadingSpace = false;
    let trailingSpace = false;
    let coreStr = p.str;

    if (p.bold || p.italic || p.link) {
      if (coreStr.startsWith(" ")) {
        leadingSpace = true;
        coreStr = coreStr.trimStart();
      }
      if (coreStr.endsWith(" ")) {
        trailingSpace = true;
        coreStr = coreStr.trimEnd();
      }
    }

    if (leadingSpace) {
      const last = nodes[nodes.length - 1];
      if (last && last.type === "text" && (!last.marks || last.marks.length === 0)) {
        if (!last.text.endsWith(" ")) last.text += " ";
      } else {
        nodes.push({ type: "text", text: " " });
      }
    }

    if (coreStr) {
      const marks: ({ type: "bold" } | { type: "italic" } | { type: "link"; attrs: { href: string } })[] = [];
      if (p.bold) marks.push({ type: "bold" });
      if (p.italic) marks.push({ type: "italic" });
      if (p.link) marks.push({ type: "link", attrs: { href: p.link } });

      const last = nodes[nodes.length - 1];
      const marksMatch =
        last &&
        last.type === "text" &&
        JSON.stringify(last.marks || []) === JSON.stringify(marks);

      if (last && last.type === "text" && marksMatch) {
        last.text += coreStr;
      } else {
        const node: TextNode = { type: "text", text: coreStr };
        if (marks.length > 0) node.marks = marks;
        nodes.push(node);
      }
    }

    if (trailingSpace) {
      nodes.push({ type: "text", text: " " });
    }
  }

  return nodes;
}

/**
 * Converts a text-based PDF directly into a freeform DocumentContent,
 * preserving font formatting (bold, italic), link URLs, bullet lists,
 * and exact document section ordering.
 */
export async function pdfToDocument(file: ArrayBuffer | Uint8Array): Promise<DocumentContent> {
  const bytes =
    file instanceof Uint8Array
      ? new Uint8Array(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength))
      : new Uint8Array(file.slice(0));
  const pdf = await getDocumentProxy(bytes);
  const numPages = pdf.numPages;

  const rawLines: RawLine[] = [];
  const allSizes: number[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    await page.getOperatorList().catch(() => null);
    const tc = await page.getTextContent();
    const annotations = await page.getAnnotations().catch(() => []);

    const links: { rect: [number, number, number, number]; url: string }[] = [];
    for (const a of annotations) {
      if (a.subtype === "Link" && a.url && Array.isArray(a.rect) && a.rect.length === 4) {
        links.push({ rect: a.rect as [number, number, number, number], url: a.url });
      }
    }

    const fonts = new Map<string, { bold: boolean; italic: boolean }>();
    for (const item of tc.items as any[]) {
      if (!fonts.has(item.fontName)) {
        try {
          const obj = page.commonObjs.get(item.fontName);
          fonts.set(item.fontName, {
            bold: Boolean(obj?.bold || /bold|black|heavy/i.test(obj?.name || "") || /bold|black|heavy/i.test(obj?.loadedName || "")),
            italic: Boolean(obj?.italic || /italic|oblique/i.test(obj?.name || "") || /italic|oblique/i.test(obj?.loadedName || "")),
          });
        } catch {
          fonts.set(item.fontName, { bold: false, italic: false });
        }
      }
    }

    const items = (tc.items as any[]).filter((it) => it.str && it.str.length > 0);
    const clusters: { y: number; pieces: TextPiece[] }[] = [];

    for (const it of items) {
      const y = it.transform[5];
      const x = it.transform[4];
      const w = it.width;
      const size = it.transform[0];
      if (size >= 8 && size <= 16) allSizes.push(size);

      const cluster = clusters.find((c) => Math.abs(c.y - y) <= 2.8);
      const f = fonts.get(it.fontName) || { bold: false, italic: false };

      // Check link annotations
      let linkUrl: string | undefined;
      for (const l of links) {
        const [minX, minY, maxX, maxY] = l.rect;
        if (x + w >= minX && x <= maxX && y >= minY - 4 && y <= maxY + 4) {
          linkUrl = l.url;
          break;
        }
      }

      const piece: TextPiece = {
        str: it.str,
        x,
        y,
        w,
        size,
        bold: f.bold,
        italic: f.italic,
        link: linkUrl,
      };

      if (cluster) cluster.pieces.push(piece);
      else clusters.push({ y, pieces: [piece] });
    }

    clusters.sort((a, b) => b.y - a.y);

    for (const c of clusters) {
      c.pieces.sort((a, b) => a.x - b.x);
      const normalized: TextPiece[] = [];
      let full = "";

      for (let i = 0; i < c.pieces.length; i++) {
        const p = c.pieces[i];
        if (i > 0) {
          const prev = c.pieces[i - 1];
          const gap = p.x - (prev.x + prev.w);
          if (gap > 1.0 && !full.endsWith(" ") && !p.str.startsWith(" ")) {
            full += " ";
            if (normalized.length > 0) {
              normalized[normalized.length - 1].str += " ";
            }
          }
        }
        full += p.str;
        normalized.push({ ...p });
      }

      rawLines.push({
        y: c.y,
        maxSize: Math.max(...c.pieces.map((p) => p.size)),
        pieces: normalized,
        fullText: full.trim(),
      });
    }
  }

  if (rawLines.length === 0) {
    throw new Error("No extractable lines found in PDF");
  }

  allSizes.sort((a, b) => a - b);
  const medianSize = allSizes.length > 0 ? allSizes[Math.floor(allSizes.length / 2)] : 10;

  const blocks: BlockNode[] = [];
  let currentList: ListItemNode[] | null = null;

  function flushList() {
    if (currentList && currentList.length > 0) {
      blocks.push({ type: "bulletList", content: currentList });
      currentList = null;
    }
  }

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const trimmed = line.fullText;
    if (!trimmed) continue;

    // 1. Candidate Name: first line with large font size
    if (i === 0 && line.maxSize >= 18) {
      flushList();
      blocks.push({
        type: "heading",
        attrs: { level: 1 },
        content: cleanPieces(line.pieces),
      });
      continue;
    }

    // 2. Section Heading: bold/upper, font size >= median * 1.1, matches section regex
    const isBoldHeader = line.pieces.every((p) => p.bold || !p.str.trim());
    const isSectionHeader =
      isBoldHeader &&
      line.maxSize >= medianSize * 1.1 &&
      SECTION_RE.test(trimmed.replace(/[:\s]+$/, ""));

    if (isSectionHeader) {
      flushList();
      blocks.push({
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: trimmed }],
      });
      continue;
    }

    // 3. Bullet line
    const isBullet = BULLET_RE.test(trimmed);
    if (isBullet) {
      if (!currentList) currentList = [];

      let bulletPieces = [...line.pieces];
      const match = trimmed.match(BULLET_RE);
      let charsToDrop = match ? match[0].length : 1;

      const strippedPieces: TextPiece[] = [];
      for (const p of bulletPieces) {
        if (charsToDrop > 0) {
          if (p.str.length <= charsToDrop) {
            charsToDrop -= p.str.length;
            continue;
          } else {
            strippedPieces.push({ ...p, str: p.str.slice(charsToDrop).trimStart() });
            charsToDrop = 0;
          }
        } else {
          strippedPieces.push(p);
        }
      }

      // Check for continuations
      while (i + 1 < rawLines.length) {
        const next = rawLines[i + 1];
        const nextTrimmed = next.fullText;
        if (!nextTrimmed) break;
        if (BULLET_RE.test(nextTrimmed)) break;

        const nextIsBoldHeader = next.pieces.every((p) => p.bold || !p.str.trim());
        if (nextIsBoldHeader && next.maxSize >= medianSize * 1.1 && SECTION_RE.test(nextTrimmed.replace(/[:\s]+$/, ""))) break;
        if (next.pieces[0]?.bold && SKILLS_KEY_RE.test(nextTrimmed)) break;
        if (next.pieces[0]?.bold && next.maxSize > medianSize * 1.05) break;
        if (next.pieces[0]?.italic && next.pieces.every((p) => p.italic || !p.str.trim())) break;

        i++;
        if (strippedPieces.length > 0) {
          strippedPieces[strippedPieces.length - 1].str += " ";
        }
        strippedPieces.push(...next.pieces);
      }

      const itemInlines = cleanPieces(strippedPieces);
      currentList.push({
        type: "listItem",
        content: [{ type: "paragraph", content: itemInlines }],
      });
      continue;
    }

    flushList();

    // 4. Entry Heading (Role + dates, Project title + dates, University)
    const startsBold = line.pieces[0]?.bold && line.pieces[0].str.trim().length > 0;
    const isSkillsLine = SKILLS_KEY_RE.test(trimmed);

    if (startsBold && !isSkillsLine && (line.maxSize >= medianSize * 1.05 || line.pieces.length >= 2)) {
      blocks.push({
        type: "heading",
        attrs: { level: 3 },
        content: cleanPieces(line.pieces),
      });
      continue;
    }

    // 5. Normal paragraph (Summary, subheaders, skills, contact info)
    const paraPieces = [...line.pieces];
    while (i + 1 < rawLines.length) {
      const next = rawLines[i + 1];
      const nextTrimmed = next.fullText;
      if (!nextTrimmed) break;
      if (BULLET_RE.test(nextTrimmed)) break;

      const nextIsBoldHeader = next.pieces.every((p) => p.bold || !p.str.trim());
      if (nextIsBoldHeader && next.maxSize >= medianSize * 1.1 && SECTION_RE.test(nextTrimmed.replace(/[:\s]+$/, ""))) break;
      if (next.pieces[0]?.bold && (next.maxSize > medianSize * 1.05 || SKILLS_KEY_RE.test(nextTrimmed))) break;
      if (next.pieces[0]?.italic && next.pieces.every((p) => p.italic || !p.str.trim())) break;

      i++;
      if (paraPieces.length > 0) {
        paraPieces[paraPieces.length - 1].str += " ";
      }
      paraPieces.push(...next.pieces);
    }

    blocks.push({
      type: "paragraph",
      content: cleanPieces(paraPieces),
    });
  }

  flushList();

  return { type: "doc", content: blocks };
}
