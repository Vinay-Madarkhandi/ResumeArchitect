import { describe, expect, it } from "vitest";
import { markdownToDocument } from "@/lib/documentMarkdown";
import {
  AlignmentType,
  Document,
  Footer,
  Header,
  ImageRun,
  LevelFormat,
  Packer,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  Textbox,
  TextRun,
} from "docx";
import { tinyPng } from "./__fixtures__/png";
import { formattingChecks } from "./formatting";
import { readResume } from "./resume";
import { inspectDocx } from "./inspectDocx";

const WORK = readResume(markdownToDocument("## Experience\n\n- Built Go services"));

const bulletLevel = (text: string, font?: string) => ({
  level: 0,
  format: LevelFormat.BULLET,
  text,
  alignment: AlignmentType.LEFT,
  ...(font ? { style: { run: { font } } } : {}),
});

/** A plain one-column resume the way most people type one in Word. */
async function cleanResume(): Promise<Buffer> {
  const doc = new Document({
    styles: { default: { document: { run: { font: "Calibri" } } } },
    numbering: { config: [{ reference: "dots", levels: [bulletLevel("●")] }] },
    sections: [
      {
        footers: { default: new Footer({ children: [new Paragraph({ children: [new TextRun({ children: [PageNumber.CURRENT] })] })] }) },
        children: [
          new Paragraph({ children: [new TextRun({ text: "Ada Lovelace", bold: true, size: 32 })] }),
          new Paragraph("ada@example.com | +1 415 555 0100"),
          new Paragraph({ children: [new TextRun({ text: "Experience", bold: true })] }),
          new Paragraph({ numbering: { reference: "dots", level: 0 }, children: [new TextRun("Built Go services")] }),
          new Paragraph({ children: [new TextRun({ text: "Shipped weekly", font: "Georgia" })] }),
        ],
      },
    ],
  });
  return Packer.toBuffer(doc);
}

/** Everything an ATS trips on: a table, contact details in the header, two columns, a photo, a text box, a decorative font, and arrow bullets. */
async function riskyResume(): Promise<Buffer> {
  const doc = new Document({
    styles: { default: { document: { run: { font: "Calibri" } } } },
    numbering: { config: [{ reference: "arrows", levels: [bulletLevel("", "Wingdings")] }] },
    sections: [
      {
        properties: { column: { count: 2, space: 708 } },
        headers: { default: new Header({ children: [new Paragraph("Ada Lovelace · ada@example.com · +1 415 555 0100")] }) },
        children: [
          new Paragraph({ children: [new ImageRun({ type: "png", data: tinyPng(), transformation: { width: 40, height: 40 } })] }),
          new Paragraph({ children: [new TextRun({ text: "Ada Lovelace", font: "Lobster" })] }),
          new Table({
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Engineer")] }),
                  new TableCell({ children: [new Paragraph("Jan 2020 – Present")] }),
                ],
              }),
            ],
          }),
          new Paragraph({ numbering: { reference: "arrows", level: 0 }, children: [new TextRun("Built Go services")] }),
          new Paragraph("★ Led the payments team"),
          new Paragraph({
            children: [new Textbox({ style: { width: "2in", height: "1in" }, children: [new Paragraph("Skills: Go, Rust")] })],
          }),
        ],
      },
    ],
  });
  return Packer.toBuffer(doc);
}

describe("inspectDocx", () => {
  it("finds nothing risky in a plain one-column resume", async () => {
    const facts = await inspectDocx(await cleanResume());
    expect(facts).toEqual({
      format: "docx",
      tables: 0,
      images: 0,
      textBoxes: 0,
      columns: 1,
      headerText: "",
      footerText: "",
      fonts: ["Calibri", "Georgia"],
      bulletChars: ["●"],
    });
  });

  it("finds tables, header contact details, columns, images, text boxes, odd fonts, and odd bullets", async () => {
    const facts = await inspectDocx(await riskyResume());
    expect(facts).toMatchObject({
      format: "docx",
      tables: 1,
      images: 1,
      textBoxes: 1,
      columns: 2,
      headerText: "Ada Lovelace · ada@example.com · +1 415 555 0100",
      footerText: "",
    });
    if (facts.format !== "docx") throw new Error(facts.reason);
    expect(facts.fonts.sort()).toEqual(["Calibri", "Lobster"]);
    expect(facts.bulletChars.sort()).toEqual(["➢", "★"].sort());
  });

  it("feeds the formatting checks: a clean file passes, a risky one fails each layout check", async () => {
    const status = (facts: Awaited<ReturnType<typeof inspectDocx>>) =>
      Object.fromEntries(formattingChecks(facts, WORK).map((c) => [c.id, c.status]));
    expect(status(await inspectDocx(await cleanResume()))).toEqual({
      tables: "pass",
      "header-footer": "pass",
      images: "pass",
      columns: "pass",
      "text-boxes": "pass",
      fonts: "pass",
      "special-characters": "pass",
      "section-heading-names": "pass",
    });
    expect(status(await inspectDocx(await riskyResume()))).toEqual({
      tables: "fail",
      "header-footer": "fail",
      images: "fail",
      columns: "fail",
      "text-boxes": "fail",
      fonts: "warn",
      "special-characters": "warn",
      "section-heading-names": "pass",
    });
  });

  it("reads Word's own markup: drawings counted once, theme fonts resolved, symbol-font bullets rendered", async () => {
    const JSZip = (await import("jszip")).default;
    const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:wps="x" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
    const zip = new JSZip();
    zip.file(
      "word/document.xml",
      `<w:document ${W}><w:body>
        <w:p><w:r><w:t>Ada Lovelace</w:t></w:r></w:p>
        <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>Built Go services</w:t></w:r></w:p>
        <w:p><w:r><mc:AlternateContent>
          <mc:Choice><w:drawing><wps:txbx><w:txbxContent><w:p><w:r><w:t>Skills</w:t></w:r></w:p></w:txbxContent></wps:txbx><pic:pic/></w:drawing></mc:Choice>
          <mc:Fallback><w:pict><v:textbox><w:txbxContent><w:p><w:r><w:t>Skills</w:t></w:r></w:p></w:txbxContent></v:textbox><v:imagedata/></w:pict></mc:Fallback>
        </mc:AlternateContent></w:r></w:p>
        <w:sectPr><w:cols w:space="720"/></w:sectPr>
      </w:body></w:document>`,
    );
    zip.file(
      "word/styles.xml",
      `<w:styles ${W}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi"/></w:rPr></w:rPrDefault></w:docDefaults></w:styles>`,
    );
    zip.file(
      "word/theme/theme1.xml",
      `<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:themeElements><a:fontScheme><a:majorFont><a:latin typeface="Aptos Display"/></a:majorFont><a:minorFont><a:latin typeface="Aptos"/></a:minorFont></a:fontScheme></a:themeElements></a:theme>`,
    );
    zip.file(
      "word/numbering.xml",
      `<w:numbering ${W}><w:abstractNum w:abstractNumId="7"><w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/><w:lvlText w:val="\uF0B7"/><w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol"/></w:rPr></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="7"/></w:num></w:numbering>`,
    );
    const facts = await inspectDocx(await zip.generateAsync({ type: "uint8array" }));
    expect(facts).toMatchObject({ textBoxes: 1, images: 1, columns: 1, fonts: ["Aptos"], bulletChars: ["•"], headerText: "", footerText: "" });
  });

  it("recognizes tables and attributes by namespace URI with different prefixes", async () => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    zip.file("word/document.xml", `<wp:document xmlns:wp="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
      xmlns:w="urn:unrelated"><wp:body><wp:tbl/><w:tbl/><wp:p><wp:r>
      <wp:rPr><wp:rFonts wp:ascii="Calibri"/></wp:rPr><wp:t>Ada Lovelace</wp:t>
      </wp:r></wp:p></wp:body></wp:document>`);
    expect(await inspectDocx(await zip.generateAsync({ type: "uint8array" }))).toMatchObject({
      format: "docx", tables: 1, fonts: ["Calibri"],
    });
  });

  it("rejects malformed Word XML even if the parser could repair it", async () => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    zip.file("word/document.xml", `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body><w:p><w:r><w:t>Ada Lovelace</w:r></w:p></w:body></w:document>`);
    expect(await inspectDocx(await zip.generateAsync({ type: "uint8array" }))).toMatchObject({
      format: "invalid", reason: "unreadable",
    });
  });

  it("rejects a file that is not a Word document", async () => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    zip.file("hello.txt", "hi");
    await expect(inspectDocx(await zip.generateAsync({ type: "uint8array" }))).resolves.toMatchObject({
      format: "invalid", reason: "unreadable",
    });
  });
});
