import { describe, expect, it } from "vitest";
import { createElement as h, type ReactElement } from "react";
import { Document, Image, Page, renderToBuffer, Text, View } from "@react-pdf/renderer";
import { tinyPng } from "./__fixtures__/png";
import { formattingChecks } from "./formatting";
import { countColumns, fontFamily, inspectPdf, type Segment } from "./inspectPdf";

const BULLET_TEXT =
  "Built and ran payment services in Go and PostgreSQL that handled two million requests a day across three regions";

function pdf(...children: ReactElement[]): Promise<Buffer> {
  return renderToBuffer(
    h(Document, null, h(Page, { size: "LETTER", style: { padding: 40, fontFamily: "Times-Roman", fontSize: 10 } }, ...children)),
  );
}

const name = () => h(Text, { style: { fontFamily: "Helvetica-Bold", fontSize: 18 } }, "Ada Lovelace");

/** One column with role titles on the left and dates pushed to the right edge, the layout most resumes use. */
function singleColumn(bullet = "•", extra: ReactElement[] = []) {
  const roles = ["Jan 2021 – Dec 2023", "Feb 2018 – Dec 2020", "Mar 2016 – Jan 2018", "Jun 2014 – Feb 2016"].flatMap((dates, i) => [
    h(View, { key: `r${i}`, style: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 } },
      h(Text, null, `Engineer, Company ${i}`),
      h(Text, null, dates)),
    ...[0, 1, 2].map((b) => h(Text, { key: `b${i}${b}` }, `${bullet} ${BULLET_TEXT}`)),
  ]);
  return pdf(name(), h(Text, null, "ada@example.com | +1 415 555 0100"), ...extra, ...roles);
}

/** A full-width name over a skills sidebar and a main column. */
function twoColumn() {
  const left = Array.from({ length: 14 }, (_, i) => h(Text, { key: i }, `Skill number ${i}`));
  const right = Array.from({ length: 6 }, (_, i) => h(Text, { key: i, style: { marginBottom: 4 } }, `• ${BULLET_TEXT}`));
  return pdf(
    name(),
    h(Text, null, "ada@example.com | +1 415 555 0100 | linkedin.com/in/ada | github.com/ada | Lisbon, Portugal"),
    h(View, { style: { flexDirection: "row", marginTop: 12 } },
      h(View, { style: { width: "28%" } }, ...left),
      h(View, { style: { width: "66%", marginLeft: "6%" } }, ...right)),
  );
}

describe("inspectPdf", () => {
  it("reads a one-column resume with right-aligned dates as one column", async () => {
    const facts = await inspectPdf(await singleColumn());
    expect(facts).toMatchObject({
      format: "pdf",
      hasTextLayer: true,
      columns: 1,
      images: 0,
      tables: null,
      textBoxes: null,
      headerText: null,
      footerText: null,
      bulletChars: ["•"],
    });
    if (facts.format !== "pdf") throw new Error(facts.reason);
    expect(facts.fonts.sort()).toEqual(["Helvetica", "Times"]);
  });

  it("finds a sidebar layout's two columns", async () => {
    expect(await inspectPdf(await twoColumn())).toMatchObject({ columns: 2 });
  });

  it("counts drawn images and reports odd bullet glyphs", async () => {
    const photo = h(Image, { key: "photo", src: { data: tinyPng(), format: "png" }, style: { width: 40, height: 40 } });
    const facts = await inspectPdf(await singleColumn("»", [photo]));
    expect(facts).toMatchObject({ images: 1, bulletChars: ["»"] });
  });

  it("flags a scanned PDF as having no text", async () => {
    const scan = await pdf(h(Image, { src: { data: tinyPng(), format: "png" }, style: { width: 500, height: 700 } }));
    expect(await inspectPdf(scan)).toMatchObject({ hasTextLayer: false, images: 1, fonts: [] });
  });

  it("rejects a PDF with more pages than the inspection budget", async () => {
    const pages = Array.from({ length: 21 }, (_, i) => h(Page, { key: i }, name()));
    const file = await renderToBuffer(h(Document, null, ...pages));
    await expect(inspectPdf(file)).resolves.toMatchObject({ format: "invalid", reason: "too-large" });
  });

  it("feeds the formatting checks: only what a PDF can show is checked", async () => {
    const checks = formattingChecks(await inspectPdf(await twoColumn()), "");
    expect(checks.map((c) => [c.id, c.status])).toEqual([
      ["images", "pass"],
      ["columns", "fail"],
      ["fonts", "pass"],
      ["special-characters", "pass"],
    ]);
  });
});

describe("countColumns", () => {
  const seg = (x: number, end: number, y: number): Segment => ({ x, end, y, text: "" });

  it("does not take a tab-aligned skills block for a second column", () => {
    const body = Array.from({ length: 20 }, (_, i) => seg(40, 560, 700 - i * 12));
    const skills = Array.from({ length: 10 }, (_, i) => [seg(40, 110, 300 - i * 12), seg(200, 400, 300 - i * 12)]).flat();
    expect(countColumns([...body, ...skills], 612)).toBe(1);
  });

  it("counts three columns when two gutters run down the page", () => {
    const rows = Array.from({ length: 12 }, (_, i) => 700 - i * 14);
    const segments = rows.flatMap((y) => [seg(40, 200, y), seg(220, 380, y), seg(400, 560, y)]);
    expect(countColumns(segments, 612)).toBe(3);
  });
});

describe("fontFamily", () => {
  it.each([
    ["ABCDEF+Calibri-Bold", "Calibri"],
    ["TimesNewRomanPSMT", "Times New Roman"],
    ["Arial-BoldMT", "Arial"],
    ["Times-Roman", "Times"],
    ["CMR10", "CMR"],
  ])("%s → %s", (raw, family) => {
    expect(fontFamily(raw)).toBe(family);
  });
});
