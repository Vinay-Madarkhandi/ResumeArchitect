import yauzl, { type Entry, type ZipFile } from "yauzl";
import { DOMParser } from "@xmldom/xmldom";
import { InspectionLimit, MAX_DOCX_BYTES, MAX_DOCX_ENTRIES, MAX_XML_BYTES } from "./inspectLimits.ts";
import type { ResumeFileFacts } from "./report";

/**
 * Reads a .docx for the layout facts the formatting checks need: what an
 * ATS may skip or scramble (tables, text boxes, columns, header content,
 * images) and what may render wrong (fonts, bullet glyphs).
 */

type Xml = Document;

function parse(text: string): Xml {
  let malformed = false;
  const doc = new DOMParser({ errorHandler: () => { malformed = true; } }).parseFromString(text, "text/xml");
  if (malformed || !doc.documentElement || doc.doctype) throw new Error("Malformed Word XML.");
  return doc;
}

const NAMESPACES: Record<string, readonly string[]> = {
  w: ["http://schemas.openxmlformats.org/wordprocessingml/2006/main", "http://purl.oclc.org/ooxml/wordprocessingml/main"],
  a: ["http://schemas.openxmlformats.org/drawingml/2006/main", "http://purl.oclc.org/ooxml/drawingml/main"],
  pic: ["http://schemas.openxmlformats.org/drawingml/2006/picture", "http://purl.oclc.org/ooxml/drawingml/picture"],
  c: ["http://schemas.openxmlformats.org/drawingml/2006/chart", "http://purl.oclc.org/ooxml/drawingml/chart"],
  dgm: ["http://schemas.openxmlformats.org/drawingml/2006/diagram", "http://purl.oclc.org/ooxml/drawingml/diagram"],
  mc: ["http://schemas.openxmlformats.org/markup-compatibility/2006"],
  v: ["urn:schemas-microsoft-com:vml"],
};

function expandedName(name: string) {
  const [prefix, localName] = name.split(":");
  return { localName: localName ?? prefix, namespaces: NAMESPACES[prefix] ?? [] };
}

function isElement(node: Node, name: ReturnType<typeof expandedName>): node is Element {
  const element = node as Element;
  return node.nodeType === 1 && element.localName === name.localName && name.namespaces.includes(element.namespaceURI ?? "");
}

async function indexParts(zip: ZipFile): Promise<Map<string, Entry>> {
  if (zip.entryCount > MAX_DOCX_ENTRIES) throw new InspectionLimit();
  const entries = new Map<string, Entry>();
  let total = 0;
  for await (const entry of zip.eachEntry()) {
    total += entry.uncompressedSize;
    if (total > MAX_DOCX_BYTES || (/\.xml$/i.test(entry.fileName) && entry.uncompressedSize > MAX_XML_BYTES)) {
      throw new InspectionLimit();
    }
    if (entries.has(entry.fileName)) throw new Error("Duplicate Word archive part.");
    entries.set(entry.fileName, entry);
  }
  return entries;
}

async function part(zip: ZipFile, entry: Entry | undefined): Promise<Xml | null> {
  if (!entry) return null;
  // yauzl validates the declared size while inflating. Keep our own bounded
  // buffer and stop the stream immediately if any chunk would exceed it.
  const stream = await zip.openReadStreamPromise(entry);
  const bytes = Buffer.alloc(entry.uncompressedSize);
  let offset = 0;
  try {
    for await (const chunk of stream as AsyncIterable<Buffer>) {
      if (offset + chunk.byteLength > Math.min(bytes.byteLength, MAX_XML_BYTES)) throw new InspectionLimit();
      offset += chunk.copy(bytes, offset);
    }
  } finally {
    stream.destroy();
  }
  return parse(bytes.toString("utf8", 0, offset));
}

const FALLBACK = expandedName("mc:Fallback");
const PARAGRAPH = expandedName("w:p");

/** Word writes a modern and a legacy copy of drawings; only the modern one counts. */
function insideFallback(el: Element): boolean {
  for (let p = el.parentNode; p; p = p.parentNode) if (isElement(p, FALLBACK)) return true;
  return false;
}

function all(xml: Xml | Element, tag: string): Element[] {
  const { localName, namespaces } = expandedName(tag);
  return namespaces.flatMap((ns) => Array.from(xml.getElementsByTagNameNS(ns, localName))).filter((el) => !insideFallback(el));
}

function child(el: Element | null, name: string): Element | null {
  const tag = expandedName(name);
  for (let n = el?.firstChild; n; n = n.nextSibling) if (isElement(n, tag)) return n;
  return null;
}

function attr(el: Element | null, name: string): string | null {
  if (!el) return null;
  const { localName, namespaces } = expandedName(name);
  if (namespaces.length === 0) return el.getAttributeNS(null, localName) || null;
  return namespaces.map((ns) => el.getAttributeNS(ns, localName)).find(Boolean) || null;
}

function paragraphText(p: Element): string {
  return all(p, "w:t")
    .map((t) => t.textContent ?? "")
    .join("");
}

function partText(xml: Xml): string {
  return all(xml, "w:p")
    .map(paragraphText)
    .filter((t) => t.trim())
    .join("\n");
}

const SYMBOL_FONTS = /^(symbol|wingdings( \d)?|webdings|zapf ?dingbats|mt extra|marlett)$/i;

interface FontScheme {
  minor: string | null;
  major: string | null;
}

function themeFonts(theme: Xml | null): FontScheme {
  const typeface = (tag: string) => attr(child(theme ? all(theme, tag)[0] ?? null : null, "a:latin"), "typeface");
  return { minor: typeface("a:minorFont"), major: typeface("a:majorFont") };
}

/** The font an rFonts element names, following theme references ("minorHAnsi" → Calibri). */
function fontOf(rFonts: Element | null, theme: FontScheme): string | null {
  if (!rFonts) return null;
  const direct = attr(rFonts, "w:ascii") ?? attr(rFonts, "w:hAnsi");
  if (direct) return direct;
  const ref = attr(rFonts, "w:asciiTheme") ?? attr(rFonts, "w:hAnsiTheme");
  if (!ref) return null;
  return ref.startsWith("major") ? theme.major : theme.minor;
}

interface Styles {
  /** Font a style sets, following basedOn; null when it inherits the default. */
  font(styleId: string | null): string | null;
  defaultParagraphStyle: string | null;
  defaultFont: string | null;
}

function readStyles(styles: Xml | null, theme: FontScheme): Styles {
  const byId = new Map<string, Element>();
  let defaultParagraphStyle: string | null = null;
  for (const s of styles ? all(styles, "w:style") : []) {
    const id = attr(s, "w:styleId");
    if (!id) continue;
    byId.set(id, s);
    if (attr(s, "w:type") === "paragraph" && attr(s, "w:default") === "1") defaultParagraphStyle = id;
  }
  const docDefaults = styles ? all(styles, "w:rPrDefault")[0] ?? null : null;
  const defaultFont = fontOf(child(child(docDefaults, "w:rPr"), "w:rFonts"), theme) ?? theme.minor;

  const font = (styleId: string | null, seen = new Set<string>()): string | null => {
    if (!styleId || seen.has(styleId)) return null;
    seen.add(styleId);
    const style = byId.get(styleId);
    if (!style) return null;
    return fontOf(child(child(style, "w:rPr"), "w:rFonts"), theme) ?? font(attr(child(style, "w:basedOn"), "w:val"), seen);
  };
  return { font, defaultParagraphStyle, defaultFont };
}

function ownParagraph(el: Element): Element | null {
  for (let p = el.parentNode; p; p = p.parentNode) if (isElement(p, PARAGRAPH)) return p;
  return null;
}

/** Fonts the visible text is actually set in: run formatting, then character style, paragraph style, document default. */
function usedFonts(doc: Xml, styles: Styles, theme: FontScheme): string[] {
  const fonts = new Set<string>();
  for (const run of all(doc, "w:r")) {
    const text = all(run, "w:t")
      .map((t) => t.textContent ?? "")
      .join("");
    if (!text.trim()) continue;
    const rPr = child(run, "w:rPr");
    const p = ownParagraph(run);
    const pStyle = attr(child(child(p, "w:pPr"), "w:pStyle"), "w:val") ?? styles.defaultParagraphStyle;
    const font =
      fontOf(child(rPr, "w:rFonts"), theme) ??
      styles.font(attr(child(rPr, "w:rStyle"), "w:val")) ??
      styles.font(pStyle) ??
      styles.defaultFont;
    if (font && !SYMBOL_FONTS.test(font)) fonts.add(font);
  }
  return [...fonts];
}

/**
 * Glyphs Word's bullet library stores as symbol-font codes, as they render.
 * Codes arrive either as private-use characters (U+F0B7) or as the raw byte.
 */
const SYMBOL_FONT_GLYPHS: Record<string, Record<number, string>> = {
  symbol: { 0xb7: "•" },
  wingdings: { 0xa7: "▪", 0x6c: "●", 0x6e: "■", 0x71: "❑", 0x76: "❖", 0xd8: "➢", 0xfc: "✓" },
};

function renderGlyph(text: string, font: string | null): string {
  const table = font ? SYMBOL_FONT_GLYPHS[font.toLowerCase()] : undefined;
  if (!table || !text) return text;
  const code = text.codePointAt(0)!;
  return table[code >= 0xf000 ? code - 0xf000 : code] ?? text;
}

/** A bullet typed as a character at the start of the line ("➢ Led …") rather than Word numbering. */
export const TYPED_BULLET = /^\s*([^\p{L}\p{N}\s"'“”‘’([{$€£₹#@&+%.,:;!?/\\|])\s/u;

function bulletGlyphs(doc: Xml, numbering: Xml | null, theme: FontScheme): string[] {
  const glyphs = new Set<string>();
  const abstractOf = new Map<string, string>();
  const levels = new Map<string, Element>();
  for (const num of numbering ? all(numbering, "w:num") : []) {
    const id = attr(num, "w:numId");
    const abstract = attr(child(num, "w:abstractNumId"), "w:val");
    if (id && abstract) abstractOf.set(id, abstract);
  }
  for (const abstract of numbering ? all(numbering, "w:abstractNum") : []) {
    for (const lvl of all(abstract, "w:lvl")) levels.set(`${attr(abstract, "w:abstractNumId")}:${attr(lvl, "w:ilvl")}`, lvl);
  }

  for (const p of all(doc, "w:p")) {
    const numPr = child(child(p, "w:pPr"), "w:numPr");
    if (numPr) {
      const abstract = abstractOf.get(attr(child(numPr, "w:numId"), "w:val") ?? "");
      const lvl = levels.get(`${abstract}:${attr(child(numPr, "w:ilvl"), "w:val") ?? "0"}`);
      if (lvl && attr(child(lvl, "w:numFmt"), "w:val") === "bullet") {
        const text = attr(child(lvl, "w:lvlText"), "w:val") ?? "";
        const font = fontOf(child(child(lvl, "w:rPr"), "w:rFonts"), theme);
        if (text.trim()) glyphs.add(renderGlyph(text.trim(), font));
      }
    }
    const typed = TYPED_BULLET.exec(paragraphText(p));
    if (typed) glyphs.add(typed[1]);
  }
  return [...glyphs];
}

function columnCount(doc: Xml): number {
  const counts = all(doc, "w:sectPr").map((sect) => {
    const cols = child(sect, "w:cols");
    const num = Number(attr(cols, "w:num") ?? 1);
    const explicit = cols ? all(cols, "w:col").length : 0;
    return Math.max(num, explicit, 1);
  });
  return Math.max(1, ...counts);
}

function graphics(xml: Xml): number {
  return ["pic:pic", "v:imagedata", "c:chart", "dgm:relIds"].reduce((n, tag) => n + all(xml, tag).length, 0);
}

export async function readDocxLayout(file: Uint8Array): Promise<Extract<ResumeFileFacts, { format: "docx" }>> {
  const zip = await yauzl.fromBufferPromise(Buffer.from(file.buffer, file.byteOffset, file.byteLength), { autoClose: false });
  try {
    const entries = await indexParts(zip);
    const read = (path: string) => part(zip, entries.get(path));
    const doc = await read("word/document.xml");
    if (!doc || !isElement(doc.documentElement, expandedName("w:document")) || !child(doc.documentElement, "w:body")) {
      throw new Error("Not a Word document.");
    }
    const theme = themeFonts(await read("word/theme/theme1.xml"));
    const styles = readStyles(await read("word/styles.xml"), theme);
    const numbering = await read("word/numbering.xml");

    const facts = {
      tables: all(doc, "w:tbl").length,
      images: graphics(doc),
      textBoxes: all(doc, "w:txbxContent").length,
      columns: columnCount(doc),
      headerText: "",
      footerText: "",
      fonts: usedFonts(doc, styles, theme),
      bulletChars: bulletGlyphs(doc, numbering, theme),
    };
    const headers: string[] = [];
    const footers: string[] = [];
    for (const path of [...entries.keys()].sort()) {
      const margin = /^word\/(header|footer)\d*\.xml$/.exec(path);
      if (!margin) continue;
      const xml = (await read(path))!;
      facts.images += graphics(xml);
      facts.textBoxes += all(xml, "w:txbxContent").length;
      const text = partText(xml);
      if (text) (margin[1] === "header" ? headers : footers).push(text);
    }
    facts.headerText = headers.join("\n");
    facts.footerText = footers.join("\n");
    return { format: "docx", ...facts };
  } finally {
    zip.close();
  }
}
