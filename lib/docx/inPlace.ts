import JSZip from "jszip";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { diffUnits, diffWords } from "@/lib/resume/diff";
import { fromUnits, toUnits, unitFromMarkdown, type Unit, type UnitKind } from "@/lib/resume/units";
import { inlineToMarkdown } from "@/lib/documentMarkdown";
import type { DocumentContent, InlineNode } from "@/lib/schemas/document";

/**
 * Edits a user's own Word file in place, so a tailored resume keeps the
 * design they made: fonts, alignment, spacing, tab stops, and page setup are
 * never touched, only the words inside existing runs.
 *
 * Every non-empty paragraph of the file is one line of the resume, in order.
 * Import reads those lines verbatim; export lines the current document up
 * against them again and writes each changed line back into its own
 * paragraph, spreading the new words over the paragraph's original runs so a
 * bold label stays bold and a tab before the dates stays a tab.
 */

const DOCUMENT_PART = "word/document.xml";

/** One stretch of a paragraph's text: editable (a `w:t`) or fixed (a tab, a break). */
interface Piece {
  /** The `w:t` element for editable text; null for fixed pieces. */
  t: Element | null;
  /** How the piece reads as resume text. */
  text: string;
  bold: boolean;
}

interface Paragraph {
  el: Element;
  pieces: Piece[];
  /** Leading characters (a typed bullet glyph) that belong to the paragraph, not the line. */
  prefixLength: number;
  unit: Unit;
}

const SECTION_NAMES =
  /^(professional |career |technical |core |key |work |relevant |additional )?(summary|profile|objective|experience|employment|education|skills|projects|certifications?|achievements|awards|publications|languages|interests|leadership|volunteering|competencies|expertise|history)( & [a-z ]+)?$/i;

const BULLET_PREFIX = /^\s*[•▪◦‣○●■◆➢►✓–-]\s*(?:·\s*)?/;

function child(el: Element, name: string): Element | null {
  for (let n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 1 && (n as Element).nodeName === name) return n as Element;
  return null;
}

function isOn(el: Element | null): boolean {
  if (!el) return false;
  const v = el.getAttribute("w:val");
  return v === null || v === "" || !["0", "false", "off", "none"].includes(v);
}

function ownParagraph(node: Node): Element | null {
  for (let p = node.parentNode; p; p = p.parentNode) if (p.nodeName === "w:p") return p as Element;
  return null;
}

function insideFallback(el: Element): boolean {
  for (let p = el.parentNode; p; p = p.parentNode) if (p.nodeName === "mc:Fallback") return true;
  return false;
}

function piecesOf(p: Element): Piece[] {
  const pieces: Piece[] = [];
  const runs = Array.from(p.getElementsByTagName("w:r")).filter((r) => ownParagraph(r) === p);
  for (const run of runs) {
    const rPr = child(run, "w:rPr");
    const bold = isOn(rPr && child(rPr, "w:b"));
    for (let n = run.firstChild; n; n = n.nextSibling) {
      if (n.nodeType !== 1) continue;
      const el = n as Element;
      switch (el.nodeName) {
        case "w:t":
          pieces.push({ t: el, text: el.textContent ?? "", bold });
          break;
        case "w:tab":
        case "w:ptab": {
          const prev = pieces[pieces.length - 1];
          pieces.push({ t: null, text: prev && !prev.t && prev.text.includes("·") ? "" : " · ", bold: false });
          break;
        }
        case "w:br":
        case "w:cr":
          pieces.push({ t: null, text: " ", bold: false });
          break;
        case "w:noBreakHyphen":
          pieces.push({ t: null, text: "-", bold: false });
          break;
      }
    }
  }
  return pieces;
}

function paragraphStyle(p: Element): string {
  const pPr = child(p, "w:pPr");
  const style = pPr && child(pPr, "w:pStyle");
  return style?.getAttribute("w:val") ?? "";
}

function hasNumbering(p: Element): boolean {
  const pPr = child(p, "w:pPr");
  return !!(pPr && child(pPr, "w:numPr")) || /list/i.test(paragraphStyle(p));
}

/** Best guess at what a paragraph is, for display and for the AI; the file itself is never restyled. */
function classify(p: Element, pieces: Piece[], text: string, first: boolean): { kind: UnitKind; level?: 1 | 2 | 3 } {
  const style = paragraphStyle(p).toLowerCase();
  if (first || style === "title") return { kind: "heading", level: 1 };
  if (hasNumbering(p) || BULLET_PREFIX.test(text)) return { kind: "bullet" };
  if (/^heading1$|^heading 1$/.test(style)) return { kind: "heading", level: 2 };
  if (/^heading\s?[2-9]$/.test(style)) return { kind: "heading", level: 3 };
  if (SECTION_NAMES.test(text.replace(/[:\s]+$/, ""))) return { kind: "heading", level: 2 };
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words <= 5 && text.length <= 40 && /[A-Z]/.test(text) && text === text.toUpperCase()) return { kind: "heading", level: 2 };
  let bold = "";
  for (const piece of pieces) {
    if (!piece.t) break;
    if (!piece.bold) break;
    bold += piece.text;
  }
  const label = bold.trim();
  if (label && !label.endsWith(":") && words <= 14 && label.length >= text.replace(/ · .*$/, "").trim().length * 0.5) {
    return { kind: "heading", level: 3 };
  }
  return { kind: "paragraph" };
}

function inlineOf(pieces: Piece[], from: number): InlineNode[] {
  const nodes: InlineNode[] = [];
  let skip = from;
  for (const piece of pieces) {
    let text = piece.text;
    if (skip > 0) {
      const cut = Math.min(skip, text.length);
      text = text.slice(cut);
      skip -= cut;
    }
    if (!text) continue;
    const bold = piece.t !== null && piece.bold;
    const last = nodes[nodes.length - 1];
    if (last && last.type === "text" && !!last.marks?.length === bold) last.text += text;
    else nodes.push(bold ? { type: "text", text, marks: [{ type: "bold" }] } : { type: "text", text });
  }
  return nodes;
}

function readParagraphs(xml: Document): Paragraph[] {
  const out: Paragraph[] = [];
  for (const el of Array.from(xml.getElementsByTagName("w:p"))) {
    if (insideFallback(el)) continue;
    const pieces = piecesOf(el);
    const full = pieces.map((p) => p.text).join("");
    if (!full.trim()) continue;
    const { kind, level } = classify(el, pieces, full.trim(), out.length === 0);
    const prefixLength = kind === "bullet" ? (BULLET_PREFIX.exec(full)?.[0].length ?? 0) : 0;
    const inline = inlineOf(pieces, prefixLength);
    const unit = unitFromMarkdown(kind, inlineToMarkdown(inline), { level });
    out.push({ el, pieces, prefixLength, unit });
  }
  return out;
}

async function open(file: ArrayBuffer | Uint8Array) {
  const zip = await JSZip.loadAsync(file);
  const part = zip.file(DOCUMENT_PART);
  if (!part) throw new Error("Not a Word document.");
  const xml = new DOMParser().parseFromString(await part.async("string"), "text/xml");
  return { zip, xml };
}

/** Reads a .docx as a resume document, one line per non-empty paragraph, word for word. */
export async function docxToDocument(file: ArrayBuffer | Uint8Array): Promise<DocumentContent> {
  const { xml } = await open(file);
  return fromUnits(readParagraphs(xml).map((p) => p.unit));
}

/**
 * Rewrites one paragraph's text, keeping its runs. Words the new text shares
 * with the old stay in the run they were in; new words join the run of the
 * words they replace, or else the run they sit next to.
 */
function rewrite(paragraph: { pieces: Piece[]; prefixLength: number }, newLine: string) {
  const { pieces } = paragraph;
  const editable = pieces.filter((p) => p.t);
  if (editable.length === 0) return;
  const oldText = pieces.map((p) => p.text).join("");
  const owner: number[] = [];
  pieces.forEach((p, i) => {
    for (let k = 0; k < p.text.length; k++) owner.push(i);
  });
  const body = oldText.slice(paragraph.prefixLength);
  const lead = body.length - body.trimStart().length;
  const trail = body.length - body.trimEnd().length;
  const head = oldText.slice(0, paragraph.prefixLength + lead);
  const newText = head + newLine.trim() + (trail ? oldText.slice(oldText.length - trail) : "");

  const out = pieces.map(() => "");
  const firstEditable = pieces.findIndex((p) => p.t);
  const editableAt = (i: number, dir: 1 | -1): number => {
    for (let k = i; k >= 0 && k < pieces.length; k += dir) if (pieces[k].t) return k;
    return -1;
  };
  let pos = 0;
  let pendingDelete = -1;
  for (const op of diffWords(oldText, newText)) {
    if (op.type === "equal") {
      for (let k = 0; k < op.text.length; k++) {
        const o = owner[pos + k];
        if (pieces[o].t) out[o] += op.text[k];
      }
      pos += op.text.length;
      pendingDelete = -1;
    } else if (op.type === "delete") {
      if (pendingDelete === -1) pendingDelete = editableAt(owner[pos], 1);
      pos += op.text.length;
    } else {
      let target = pendingDelete;
      if (target === -1) target = pos < owner.length ? editableAt(owner[pos], 1) : -1;
      if (target === -1 && pos > 0) target = editableAt(owner[pos - 1], -1);
      if (target === -1) target = firstEditable;
      out[target] += op.text;
    }
  }
  pieces.forEach((p, i) => {
    if (!p.t) return;
    while (p.t.firstChild) p.t.removeChild(p.t.firstChild);
    p.t.appendChild(p.t.ownerDocument.createTextNode(out[i]));
    p.t.setAttribute("xml:space", "preserve");
  });
}

/** Units compared by words alone: formatting and kind can't change in the file. */
function textUnits(units: Unit[]): Unit[] {
  return units.map((u) => ({ ...u, kind: "paragraph", level: undefined, markdown: u.text }));
}

export class DesignMismatchError extends Error {}

/**
 * Writes `doc` into the original Word file. Lines that match the file are
 * left byte-for-byte alone; changed lines are rewritten in place, new lines
 * copy the formatting of the line before them, and removed lines are deleted.
 * Throws DesignMismatchError when the document no longer resembles the file
 * (most of its lines replaced), since patching would then be guesswork.
 */
export async function patchDocx(file: ArrayBuffer | Uint8Array, doc: DocumentContent): Promise<Uint8Array> {
  const { zip, xml } = await open(file);
  const paragraphs = readParagraphs(xml);
  const base = textUnits(paragraphs.map((p) => p.unit));
  const next = textUnits(toUnits(doc));
  const byUnit = new Map(base.map((u, i) => [u, paragraphs[i]]));
  const hunks = diffUnits(base, next);

  const touchedBase = new Set(hunks.flatMap((h) => h.before));
  const touchedNext = new Set(hunks.flatMap((h) => h.after));
  const keptBase = base.filter((u) => !touchedBase.has(u));
  if (base.length > 0 && keptBase.length / base.length < 0.4) {
    throw new DesignMismatchError("This resume has changed too much from your Word file to keep its design.");
  }

  // Where each line of the new document lives in the file, filled in as hunks are applied.
  const at: (Element | null)[] = next.map(() => null);
  const keptNext = next.map((u, j) => (touchedNext.has(u) ? -1 : j)).filter((j) => j !== -1);
  keptNext.forEach((j, k) => (at[j] = byUnit.get(keptBase[k])!.el));

  for (const hunk of hunks) {
    if (hunk.kind === "modified") {
      const paragraph = byUnit.get(hunk.before[0])!;
      rewrite(paragraph, hunk.after[0].text);
      at[hunk.afterIndex] = paragraph.el;
    } else if (hunk.kind === "removed") {
      const el = byUnit.get(hunk.before[0])!.el;
      el.parentNode?.removeChild(el);
    }
  }

  const additions = hunks.filter((h) => h.kind === "added").sort((a, b) => a.afterIndex - b.afterIndex);
  for (const hunk of additions) {
    const j = hunk.afterIndex;
    const anchor = (j > 0 ? at[j - 1] : null) ?? at.find((el) => el !== null) ?? paragraphs[0]?.el;
    if (!anchor) continue;
    const clone = anchor.cloneNode(true) as Element;
    const pieces = piecesOf(clone);
    const full = pieces.map((p) => p.text).join("");
    rewrite({ pieces, prefixLength: BULLET_PREFIX.exec(full)?.[0].length ?? 0 }, hunk.after[0].text);
    if (j > 0 && at[j - 1]) anchor.parentNode!.insertBefore(clone, anchor.nextSibling);
    else anchor.parentNode!.insertBefore(clone, anchor);
    at[j] = clone;
  }

  zip.file(DOCUMENT_PART, new XMLSerializer().serializeToString(xml));
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
