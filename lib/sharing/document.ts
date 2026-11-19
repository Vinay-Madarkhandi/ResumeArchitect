import { inlineText } from "@/lib/resume/units";
import type { BlockNode, DocumentContent, InlineNode } from "@/lib/schemas/document";

const email = /[\p{L}\p{N}.!#$%&'*+\/=?^_`{|}~-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+/gu;
const phone = /(?<![\w\d])(?:\+|\(\+?)?\d(?:[\d().\p{Zs}-]{5,}\d)(?:[ \t]*(?:ext\.?|x)[ \t]*\d+)?(?![\w\d])/giu;
const url = /(?:\b(?:[a-z][a-z\d+.-]*:\/\/|mailto:|tel:|www\.)[^\s<>"'|•]+|(?<![\p{L}\p{N}@_.])(?:[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?\.)+(?:com|org|net|edu|gov|mil|info|biz|name|me|io|dev|app|tech|page|link|cloud|online|site|xyz|example|[a-z]{2})(?![\p{L}\p{N}-]|\.[\p{L}\p{N}])(?:[/?#][^\s<>"'|•]*)?)/giu;
const handle = /(?<![\p{L}\p{N}_])@[a-z\d_][\w.-]*/giu;
const streetSuffix = "(?:Street|St\\.?|Road|Rd\\.?|Avenue|Ave\\.?|Boulevard|Blvd\\.?|Lane|Ln\\.?|(?<!\\bto[ \\t]+)Drive|Dr\\.?|Court|Ct\\.?|Place|Pl\\.?|Way|Terrace|Ter\\.?|Close|Crescent|Cres\\.?|Square|Sq\\.?|Parkway|Pkwy\\.?|Trail|Trl\\.?|Highway|Hwy\\.?|Row|Mews|Circle|Cir\\.?|Grove|Grv\\.?|Alley|Walk|Plaza|Plz\\.?|Gasse|Straße|Strasse|Str\\.?)";
const apt = "(?:[, \\t]+(?:Apt\\.?|Suite|Unit|Flat|#)[ \\t]*[A-Za-z\\d-]+)?";
const notCompanyOrTech = "(?![ \\t]+(?:integrations?|apps?|apis?|services?|features?|branches?|bank|corporation|corp|inc|ltd|llc|company)\\b)";

const address = new RegExp(
  [
    `\\bP\\.[ \\t]*O\\.[ \\t]+Box[ \\t]+\\d+[a-z]?\\b|\\bPO[ \\t]+Box[ \\t]+\\d+[a-z]?\\b`,
    `\\b\\d+[A-Za-z]?(?:[-–]\\d+[A-Za-z]?)?[ \\t]+(?:[A-Za-z0-9][\\p{L}\\p{N}.'’\\-]*[ \\t]+){1,5}${streetSuffix}\\b${apt}${notCompanyOrTech}`,
    `\\b\\d+[A-Za-z]?[ \\t]+(?:rue|avenue|avenida|boulevard|via|calle|carrer|rua|alameda|paseo)[ \\t]+(?:(?:de|du|des|d'|d’)[ \\t]+)?[A-Za-z][\\p{L}'’\\-]+(?:[ \\t]+[A-Za-z][\\p{L}'’\\-]+)*\\b`,
    `\\b(?:rue|avenue|avenida|boulevard|via|calle|carrer|rua|alameda|paseo)[ \\t]+(?:[A-Za-z][\\p{L}'’\\-]+[ \\t]+){1,4}\\d+[A-Za-z]?\\b`,
    `\\b[A-Za-z][\\p{L}.'’\\-]+(?:straße|strasse|gasse|weg|allee|platz|gracht|straat|laan|plein|kade)[ \\t]+\\d+[A-Za-z]?\\b`,
    `\\b(?:Flat|Apt\\.?|Suite|Unit|#)[ \\t]*\\d+[A-Za-z]?(?:[-–]\\d+[A-Za-z]?)?[, \\t]+(?:[A-Za-z0-9][\\p{L}\\p{N}.'’\\-]*[, \\t]+){1,6}${streetSuffix}?\\b`,
    `\\b[A-Za-z0-9]+(?:[-–/][A-Za-z0-9]+)?,?[ \\t]+(?:[A-Za-z0-9][\\p{L}\\p{N}.'’\\-]*[ \\t]+){1,4}(?:Nagar|Marg|Colony|Vihar|Enclave|Bagh|Gali)\\b`,
    `\\b[A-Z]{2,4}[ \\t]+(?:Road|Rd\\.?|Marg|Street|St\\.?|Avenue|Ave\\.?|Row)\\b${notCompanyOrTech}`,
    `\\b[A-Z]{2}[, \\t]+\\d{5}(?:-\\d{4})?\\b`,
    `\\b[A-Z]{1,2}\\d[A-Z\\d]?[ \\t]*\\d[A-Z]{2}\\b`,
    `\\b[A-CEGHJ-NPR-TVXY]\\d[A-CEGHJ-NPR-TV-Z][ \\t-]*\\d[A-CEGHJ-NPR-TV-Z]\\d\\b`,
    `\\b[A-Z][a-zA-Z]+(?:[- ][A-Z][a-zA-Z]+)?[, \\t]+(?:PIN[ \\t]*-?[ \\t]*)?[1-9]\\d{5}\\b`,
  ].join("|"),
  "giu",
);

type TextBlock = Extract<BlockNode, { type: "heading" | "paragraph" }>;

function textBlocks(blocks: BlockNode[]): TextBlock[] {
  return blocks.flatMap((block) => block.type === "heading" || block.type === "paragraph"
    ? [block] : block.content.flatMap((item) => textBlocks(item.content)));
}

export function contactBlockOptions(doc: DocumentContent) {
  return textBlocks(doc.content).map((block, index) => ({ index, label: inlineText(block.content) }))
    .filter(({ label }) => label.trim());
}

function redact(nodes: InlineNode[]): InlineNode[] {
  // Search the rendered text so contacts split across bold/italic runs are
  // still detected. Hard breaks behave as line boundaries for text patterns.
  const text = nodes.map((node) => node.type === "hardBreak" ? "\n" : node.text).join("");
  const hidden = new Uint8Array(text.length);
  for (const pattern of [email, phone, url, address, handle]) {
    for (const match of text.matchAll(pattern)) {
      const value = pattern === url || pattern === handle ? match[0].replace(/[.,;:!?)}\]]+$/, "") : match[0];
      if (pattern === phone) {
        const digits = value.replace(/\D/g, "").length;
        const date = /^\d{4}\s*-\s*(?:\d{4}|\d{2}-\d{2})$/.test(value);
        const shortBareNumber = /^\d{7,9}$/.test(value)
          && !/(?:phone|call|tel|mobile|fax|whatsapp|contact)\W*$/i.test(text.slice(Math.max(0, match.index - 24), match.index));
        if (digits < 7 || digits > 15 || date || shortBareNumber) continue;
      }
      if (pattern === url) {
        if (/^(?:next|node|vue|nuxt|express)\.js$/i.test(value)) continue;
        if (/^(?:asp|vb)?\.?net$/i.test(value) || value.toLowerCase() === "asp.net") continue;
        if (/\.(?:go|py|rs|ts|js|jsx|tsx|c|cpp|h|java|rb|php|sh|yml|yaml|json|md|sql)$/i.test(value) && !value.includes("/") && !value.startsWith("http")) continue;
      }
      hidden.fill(1, match.index, match.index + value.length);
    }
  }
  let offset = 0;
  return nodes.flatMap((node): InlineNode[] => {
    if (node.type === "hardBreak") {
      offset++;
      return [node];
    }
    let visible = "";
    for (let i = 0; i < node.text.length; i++, offset++) {
      if (!hidden[offset]) visible += node.text[i];
    }
    if (!visible) return [];
    const marks = node.marks?.filter((mark) => mark.type !== "link");
    return [{ type: "text", text: visible, ...(marks?.length ? { marks } : {}) }];
  });
}

/** The same snapshot transform is used in the dialog and before persistence. */
export function sharedDocument(doc: DocumentContent, hideContact: boolean, contactBlocks: readonly number[] = []): DocumentContent {
  if (!hideContact) return { type: "doc", content: doc.content };

  const selected = new Set(contactBlocks);
  let index = 0;
  function visit(blocks: BlockNode[]): BlockNode[] {
    return blocks.flatMap((block): BlockNode[] => {
      if (block.type === "paragraph" || block.type === "heading") {
        if (selected.has(index++)) return [];
        const content = redact(block.content);
        const before = inlineText(block.content);
        return /[\p{L}\p{N}]/u.test(before) && !/[\p{L}\p{N}]/u.test(inlineText(content)) ? [] : [{ ...block, content }];
      }
      const content = block.content.map((item) => ({ ...item, content: visit(item.content) }))
        .filter((item) => item.content.length > 0);
      return content.length ? [{ ...block, content }] : [];
    });
  }
  return { type: "doc", content: visit(doc.content) };
}
