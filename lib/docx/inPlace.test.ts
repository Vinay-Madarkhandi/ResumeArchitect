import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import {
  AlignmentType,
  Document,
  LevelFormat,
  Packer,
  Paragraph,
  Tab,
  TabStopType,
  TextRun,
} from "docx";
import { DesignMismatchError, docxToDocument, patchDocx } from "./inPlace";
import { fromUnits, toUnits, withMarkdown, unitFromMarkdown } from "@/lib/resume/units";

/** A Word resume laid out like a typical hand-made one: centered header, tab-aligned dates, real bullets, bold skill labels. */
async function wordResume(): Promise<Buffer> {
  const bullet = (text: string) => new Paragraph({ numbering: { reference: "dots", level: 0 }, children: [new TextRun(text)] });
  const doc = new Document({
    numbering: {
      config: [{ reference: "dots", levels: [{ level: 0, format: LevelFormat.BULLET, text: "●", alignment: AlignmentType.LEFT }] }],
    },
    sections: [
      {
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Vinay Madarkhandi", bold: true, size: 36, font: "Calibri" })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("8856094992 | vinay@example.com | LinkedIn")] }),
          new Paragraph({}),
          new Paragraph({ children: [new TextRun({ text: "Work Experience", bold: true, size: 26 })] }),
          new Paragraph({
            tabStops: [{ type: TabStopType.RIGHT, position: 10000 }],
            children: [new TextRun({ text: "Software Engineer", bold: true }), new TextRun({ children: [new Tab(), "Jun 2026 – Present"] })],
          }),
          new Paragraph({ children: [new TextRun({ text: "Java, Spring Boot, REST APIs", italics: true })] }),
          bullet("Work as a backend Software Engineer building Java and Spring Boot services"),
          bullet("Contribute to an event-driven integration project"),
          new Paragraph({ children: [new TextRun({ text: "Technical Skills", bold: true, size: 26 })] }),
          new Paragraph({ children: [new TextRun({ text: "Languages:", bold: true }), new TextRun(" Java, JavaScript")] }),
          new Paragraph({ children: [new TextRun({ text: "Databases:", bold: true }), new TextRun(" MySQL, PostgreSQL")] }),
        ],
      },
    ],
  });
  return Packer.toBuffer(doc);
}

async function documentXml(file: Uint8Array | Buffer): Promise<string> {
  return (await JSZip.loadAsync(file)).file("word/document.xml")!.async("string");
}

/** Paragraph XML strings in order, for checking what was and wasn't touched. */
async function paragraphsXml(file: Uint8Array | Buffer): Promise<string[]> {
  return (await documentXml(file)).match(/<w:p[ >][\s\S]*?<\/w:p>/g) ?? [];
}

function edit(doc: Awaited<ReturnType<typeof docxToDocument>>, from: string, to: string) {
  const units = toUnits(doc);
  const i = units.findIndex((u) => u.text === from);
  expect(i, `line "${from}"`).toBeGreaterThan(-1);
  units[i] = withMarkdown(units[i], to);
  return fromUnits(units);
}

describe("docxToDocument", () => {
  it("reads every non-empty paragraph word for word, in order", async () => {
    const units = toUnits(await docxToDocument(await wordResume()));
    expect(units.map((u) => [u.kind, u.level ?? null, u.text])).toEqual([
      ["heading", 1, "Vinay Madarkhandi"],
      ["paragraph", null, "8856094992 | vinay@example.com | LinkedIn"],
      ["heading", 2, "Work Experience"],
      ["heading", 3, "Software Engineer · Jun 2026 – Present"],
      ["paragraph", null, "Java, Spring Boot, REST APIs"],
      ["bullet", null, "Work as a backend Software Engineer building Java and Spring Boot services"],
      ["bullet", null, "Contribute to an event-driven integration project"],
      ["heading", 2, "Technical Skills"],
      ["paragraph", null, "Languages: Java, JavaScript"],
      ["paragraph", null, "Databases: MySQL, PostgreSQL"],
    ]);
  });
});

describe("patchDocx", () => {
  it("changes only the edited line's words and leaves every other paragraph byte-identical", async () => {
    const file = await wordResume();
    const doc = edit(
      await docxToDocument(file),
      "Contribute to an event-driven integration project",
      "Contribute to an event-driven architecture (EDA) integration project with asynchronous services",
    );
    const out = await patchDocx(file, doc);
    const before = await paragraphsXml(file);
    const after = await paragraphsXml(out);
    expect(after).toHaveLength(before.length);
    const changed = after.map((p, i) => (p === before[i] ? null : i)).filter((i) => i !== null);
    expect(changed).toHaveLength(1);
    const p = after[changed[0]!];
    expect(p).toContain("event-driven architecture (EDA) integration project with asynchronous services");
    expect(p).toContain("<w:numPr>");
    expect(toUnits(await docxToDocument(out)).map((u) => u.text)).toContain(
      "Contribute to an event-driven architecture (EDA) integration project with asynchronous services",
    );
  });

  it("keeps a bold label bold and puts new words in the plain run beside it", async () => {
    const file = await wordResume();
    const out = await patchDocx(file, edit(await docxToDocument(file), "Languages: Java, JavaScript", "Languages: Java, JavaScript, TypeScript"));
    const skills = (await paragraphsXml(out)).find((p) => p.includes("Languages:"))!;
    const runs = skills.match(/<w:r>[\s\S]*?<\/w:r>/g)!;
    expect(runs).toHaveLength(2);
    expect(runs[0]).toContain("<w:b/>");
    expect(runs[0]).toContain(">Languages:<");
    expect(runs[1]).not.toContain("<w:b/>");
    expect(runs[1]).toContain(" Java, JavaScript, TypeScript<");
  });

  it("keeps the tab before the dates when the title is reworded", async () => {
    const file = await wordResume();
    const out = await patchDocx(
      file,
      edit(await docxToDocument(file), "Software Engineer · Jun 2026 – Present", "Backend Software Engineer · Jun 2026 – Present"),
    );
    const title = (await paragraphsXml(out)).find((p) => p.includes("Present"))!;
    expect(title).toContain("<w:tab/>");
    expect(title).toMatch(/>Backend Software Engineer</);
    expect(title).not.toContain("·");
  });

  it("adds a new bullet with the formatting of the bullet before it, and removes a deleted one", async () => {
    const file = await wordResume();
    const units = toUnits(await docxToDocument(file));
    const at = units.findIndex((u) => u.text.startsWith("Work as"));
    units.splice(at + 1, 0, unitFromMarkdown("bullet", "Built SKIP LOCKED schedulers for concurrent health checks"));
    const removeAt = units.findIndex((u) => u.text.startsWith("Contribute"));
    units.splice(removeAt, 1);
    const out = await patchDocx(file, fromUnits(units));
    const texts = toUnits(await docxToDocument(out)).map((u) => u.text);
    expect(texts).toContain("Built SKIP LOCKED schedulers for concurrent health checks");
    expect(texts.some((t) => t.startsWith("Contribute"))).toBe(false);
    const added = (await paragraphsXml(out)).find((p) => p.includes("SKIP LOCKED"))!;
    expect(added).toContain("<w:numPr>");
    expect(texts.indexOf("Built SKIP LOCKED schedulers for concurrent health checks")).toBe(texts.findIndex((t) => t.startsWith("Work as")) + 1);
  });

  it("returns the file unchanged in content when nothing was edited", async () => {
    const file = await wordResume();
    const out = await patchDocx(file, await docxToDocument(file));
    expect(await paragraphsXml(out)).toEqual(await paragraphsXml(file));
  });

  it("refuses when the document no longer resembles the file", async () => {
    const file = await wordResume();
    const other = fromUnits(["# Someone Else", "A different resume entirely", "- Nothing in common"].map((md) =>
      md.startsWith("# ") ? unitFromMarkdown("heading", md.slice(2), { level: 1 }) : md.startsWith("- ") ? unitFromMarkdown("bullet", md.slice(2)) : unitFromMarkdown("paragraph", md),
    ));
    await expect(patchDocx(file, other)).rejects.toBeInstanceOf(DesignMismatchError);
  });
});
