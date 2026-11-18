import { crc32, createDeflate, createDeflateRaw, deflateRawSync } from "node:zlib";

/**
 * The upload bombs from the scanner review (/tmp/ra_vf2/gen_files.py),
 * rebuilt in memory so tests need no binary fixtures.
 */

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const CONTENT_TYPES = '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/></Types>';
const RELS = '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
const PARAGRAPH = Buffer.from(`<w:p><w:r><w:t>${"a".repeat(74)}</w:t></w:r></w:p>`.repeat(10_000));

interface ZipEntry { name: string; data: Buffer; crc: number; size: number; declaredSize: number }

async function deflateChunks(chunks: Iterable<Buffer>, deflate = createDeflateRaw({ level: 9 })): Promise<Buffer> {
  const out: Buffer[] = [];
  deflate.on("data", (chunk: Buffer) => out.push(chunk));
  const done = new Promise((resolve, reject) => deflate.on("end", resolve).on("error", reject));
  for (const chunk of chunks) {
    if (!deflate.write(chunk)) await new Promise((resolve) => deflate.once("drain", resolve));
  }
  deflate.end();
  await done;
  return Buffer.concat(out);
}

function small(name: string, text: string): ZipEntry {
  const raw = Buffer.from(text);
  return { name, data: deflateRawSync(raw), crc: crc32(raw), size: raw.length, declaredSize: raw.length };
}

function zip(entries: ZipEntry[]): Buffer {
  const local: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(8, 8);
    header.writeUInt32LE(entry.crc, 14);
    header.writeUInt32LE(entry.data.length, 18);
    header.writeUInt32LE(entry.declaredSize, 22);
    header.writeUInt16LE(name.length, 26);
    local.push(header, name, entry.data);

    const record = Buffer.alloc(46);
    record.writeUInt32LE(0x02014b50, 0);
    record.writeUInt16LE(20, 4);
    record.writeUInt16LE(20, 6);
    record.writeUInt16LE(8, 10);
    record.writeUInt32LE(entry.crc, 16);
    record.writeUInt32LE(entry.data.length, 20);
    record.writeUInt32LE(entry.declaredSize, 24);
    record.writeUInt16LE(name.length, 28);
    record.writeUInt32LE(offset, 42);
    central.push(record, name);
    offset += header.length + name.length + entry.data.length;
  }
  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, directory, end]);
}

/**
 * A Word file whose document.xml inflates to `megabytes` of real paragraphs
 * from well under 1 MB on disk (bomb_250.docx is 250). With `lying`, the
 * archive declares a 400-byte document.xml, as bomb_lying.docx did.
 */
export async function docxBomb(megabytes: number, { lying = false } = {}): Promise<Buffer> {
  const head = Buffer.from(`<?xml version="1.0"?><w:document ${W}><w:body>`);
  const tail = Buffer.from("</w:body></w:document>");
  const repeats = Math.floor((megabytes * 1024 * 1024) / PARAGRAPH.length);
  const parts = function* () {
    yield head;
    for (let i = 0; i < repeats; i++) yield PARAGRAPH;
    yield tail;
  };
  let crc = 0;
  let size = 0;
  for (const part of parts()) {
    crc = crc32(part, crc);
    size += part.length;
  }
  const document = { name: "word/document.xml", data: await deflateChunks(parts()), crc, size, declaredSize: lying ? 400 : size };
  return zip([small("[Content_Types].xml", CONTENT_TYPES), small("_rels/.rels", RELS), document]);
}

/** A small, ordinary Word resume. */
export function docxResume(lines = ["Ada Lovelace", "ada@example.com", "Experience", "Built Go services and PostgreSQL pipelines"]): Buffer {
  const body = lines.map((line) => `<w:p><w:r><w:t>${line}</w:t></w:r></w:p>`).join("");
  return zip([
    small("[Content_Types].xml", CONTENT_TYPES),
    small("_rels/.rels", RELS),
    small("word/document.xml", `<?xml version="1.0"?><w:document ${W}><w:body>${body}</w:body></w:document>`),
  ]);
}

function pdf(objects: Buffer[]): Buffer {
  const parts: Buffer[] = [Buffer.from("%PDF-1.4\n")];
  let length = parts[0].length;
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(length);
    const object = Buffer.concat([Buffer.from(`${i + 1} 0 obj\n`), body, Buffer.from("\nendobj\n")]);
    parts.push(object);
    length += object.length;
  });
  const xref = [`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`, ...offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`)].join("");
  parts.push(Buffer.from(`${xref}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${length}\n%%EOF\n`));
  return Buffer.concat(parts);
}

const stream = (data: Buffer, dict = "") => Buffer.concat([Buffer.from(`<< /Length ${data.length}${dict} >>\nstream\n`), data, Buffer.from("\nendstream")]);
const FONT = Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

/** A text PDF of `pages` pages (pdf_2000pages.pdf is 2000). */
export function pdfPages(pages: number, line = (page: number) => `Page ${page} Ada Lovelace built Go services`): Buffer {
  const kids = Array.from({ length: pages }, (_, i) => `${3 + i} 0 R`).join(" ");
  const font = 3 + pages * 2;
  return pdf([
    Buffer.from("<< /Type /Catalog /Pages 2 0 R >>"),
    Buffer.from(`<< /Type /Pages /Kids [${kids}] /Count ${pages} >>`),
    ...Array.from({ length: pages }, (_, i) => Buffer.from(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${3 + pages + i} 0 R /Resources << /Font << /F1 ${font} 0 R >> >> >>`,
    )),
    ...Array.from({ length: pages }, (_, i) => stream(Buffer.from(`BT /F1 12 Tf 72 720 Td (${line(i)}) Tj ET`))),
    FONT,
  ]);
}

/** A one-page PDF whose content stream inflates to `megabytes` of spaces (pdf_flatebomb.pdf is 600). */
export async function pdfFlateBomb(megabytes: number): Promise<Buffer> {
  const spaces = Buffer.alloc(1024 * 1024, 0x20);
  const compressed = await deflateChunks(Array.from({ length: megabytes }, () => spaces), createDeflate({ level: 9 }));
  return pdf([
    Buffer.from("<< /Type /Catalog /Pages 2 0 R >>"),
    Buffer.from("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    Buffer.from("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>"),
    stream(compressed, " /Filter /FlateDecode"),
    FONT,
  ]);
}
