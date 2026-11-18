import { fail, pass, warn, type Check, type FormattingCheckId, type LayoutFacts, type ResumeFileFacts } from "./report";
import { findEmail, findLinkedIn, findPhone, sectionHeadingRenames, type ResumeModel } from "./resume";

/**
 * Layout an ATS may misread (docs/research/jobscan.md §3.4). The facts come
 * from a file inspector (inspectDocx, inspectPdf); a fact the format can't
 * report is null and its check is left out. Odd characters are also read
 * from the resume text, so a pasted resume still gets that check.
 */

type FormattingCheck = Check<FormattingCheckId>;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function tables({ tables: count }: LayoutFacts): FormattingCheck | null {
  if (count === null) return null;
  const label = "Tables";
  if (count === 0) return pass("tables", label, "No tables, so an ATS reads your lines in order.");
  return fail(
    "tables",
    label,
    `Your resume has ${plural(count, "table")}. Many ATS read tables cell by cell or skip them, scrambling titles and dates.`,
    "Replace tables with plain lines, and line up dates with a right-aligned tab stop.",
  );
}

const PAGE_NUMBER = /^(page\s*)?\d*\s*(of\s*\d*)?$/i;

function headerFooter({ headerText, footerText }: LayoutFacts): FormattingCheck | null {
  if (headerText === null || footerText === null) return null;
  const label = "Headers and footers";
  const text = [headerText, footerText].map((t) => t.trim()).filter((t) => t && !PAGE_NUMBER.test(t)).join("\n");
  if (!text) return pass("header-footer", label, "Nothing but page numbers sits in the header or footer.");
  const contact = [
    findEmail(text) && "email address",
    findPhone(text) && "phone number",
    findLinkedIn({ text, links: [] }) && "LinkedIn URL",
  ].filter((x): x is string => typeof x === "string");
  if (contact.length > 0) {
    return fail(
      "header-footer",
      label,
      `Your ${contact.join(" and ")} ${contact.length === 1 ? "is" : "are"} in the Word header or footer, which many ATS skip.`,
      "Move your name and contact details into the body, at the top of the page.",
    );
  }
  const preview = text.length > 60 ? `${text.slice(0, 57)}…` : text;
  return warn(
    "header-footer",
    label,
    `Your header or footer holds "${preview.replace(/\n/g, " ")}", which many ATS skip.`,
    "Keep only page numbers there and move the rest into the body.",
  );
}

function images({ images: count }: LayoutFacts): FormattingCheck {
  const label = "Images and graphics";
  if (count === 0) return pass("images", label, "No images, logos, or icons.");
  return fail(
    "images",
    label,
    `Found ${plural(count, "image")}. An ATS can't read a photo, logo, icon, or chart, and any text inside one is lost.`,
    "Remove images, and write anything they say (an icon's label, a skill rating) as plain text.",
  );
}

function columns({ columns: count }: LayoutFacts): FormattingCheck {
  const label = "Columns";
  if (count <= 1) return pass("columns", label, "A single column, so lines read in the right order.");
  return fail(
    "columns",
    label,
    `Your resume is laid out in ${count} columns. Many ATS read straight across the page, mixing lines from each column.`,
    "Use one column, and move sidebar content such as skills into its own section.",
  );
}

function textBoxes({ textBoxes: count }: LayoutFacts): FormattingCheck | null {
  if (count === null) return null;
  const label = "Text boxes";
  if (count === 0) return pass("text-boxes", label, "No floating text boxes.");
  return fail(
    "text-boxes",
    label,
    `Found ${plural(count, "text box")}. ATS often skip floating text boxes entirely.`,
    "Move the text into ordinary paragraphs.",
  );
}

/** Fonts every ATS and every reader's computer handles, as lower-case names without spaces. */
const STANDARD_FONTS = new Set([
  "aptos", "aptosdisplay", "aptosnarrow", "arial", "arialnarrow", "avenir", "avenirnext", "baskerville", "bookantiqua",
  "bookman", "bookmanoldstyle", "caladea", "calibri", "calibrilight", "cambria", "candara", "carlito", "century",
  "centurygothic", "centuryschoolbook", "charter", "cmr", "computermodern", "consolas", "constantia", "corbel",
  "courier", "couriernew", "dejavusans", "dejavuserif", "didot", "ebgaramond", "franklingothic", "franklingothicbook",
  "garamond", "georgia", "gillsans", "gillsansmt", "helvetica", "helveticaneue", "ibmplexsans", "ibmplexserif",
  "inter", "latinmodern", "lato", "liberationsans", "liberationserif", "librebaskerville", "lmroman", "lucidagrande",
  "lucidasans", "merriweather", "montserrat", "notosans", "notoserif", "nunito", "opensans", "optima", "palatino",
  "palatinolinotype", "ptsans", "ptserif", "raleway", "roboto", "segoeui", "sourcesans", "sourcesanspro",
  "sourceserifpro", "tahoma", "times", "timesnewroman", "trebuchetms", "verdana",
]);

const fontKey = (name: string) => name.toLowerCase().replace(/[^a-z]/g, "");

function fonts({ fonts: used }: LayoutFacts): FormattingCheck | null {
  if (used.length === 0) return null;
  const label = "Fonts";
  const odd = used.filter((f) => !STANDARD_FONTS.has(fontKey(f)));
  if (odd.length === 0) return pass("fonts", label, `Set in ${used.join(", ")}: standard fonts that read cleanly everywhere.`);
  return warn(
    "fonts",
    label,
    `${odd.join(", ")} ${odd.length === 1 ? "isn't a standard font" : "aren't standard fonts"}. Systems without ${odd.length === 1 ? "it" : "them"} substitute another or misread characters.`,
    "Use a standard font such as Calibri, Arial, Garamond, or Times New Roman.",
  );
}

const SAFE_BULLETS = new Set(["•", "●", "◦", "○", "▪", "■", "-", "–", "—", "*", "·", "o"]);
/** Icon fonts (private use), emoji, dingbats, and decorative shapes. */
const ODD_SYMBOL = /[\u{E000}-\u{F8FF}\u{2600}-\u{27BF}\u{25A0}-\u{25FF}\u{1F000}-\u{1FAFF}]/gu;

function specialCharacters(facts: LayoutFacts | null, text: string): FormattingCheck {
  const label = "Special characters";
  const odd = new Set([
    ...(facts?.bulletChars ?? []).filter((c) => !SAFE_BULLETS.has(c)),
    ...Array.from(text.matchAll(ODD_SYMBOL), (m) => m[0]).filter((c) => !SAFE_BULLETS.has(c)),
  ]);
  if (odd.size === 0) return pass("special-characters", label, "Bullets and symbols are plain characters every ATS reads.");
  return warn(
    "special-characters",
    label,
    `${[...odd].join(" ")} may not survive parsing and can show up as boxes or question marks.`,
    'Use plain round bullets (•) and write symbols as words, e.g. "Phone:" instead of an icon.',
  );
}

/** §3.4 lists heading names under Formatting too, overlapping the Searchability check. */
function headingNames(resume: ResumeModel): FormattingCheck {
  const id = "section-heading-names";
  const label = "Section heading names";
  const renames = sectionHeadingRenames(resume);
  if (renames.length > 0) return warn(id, label, "Some headings may be misread by an ATS.", `Rename ${renames.join(", ")}.`);
  if (resume.sections.length === 0) {
    return warn(id, label, "No section headings were found.", 'Use headings such as "Work Experience", "Education", and "Skills".');
  }
  return pass(id, label, "Your headings use standard names that ATS recognize.");
}

export function formattingChecks(file: ResumeFileFacts | null, resume: ResumeModel): FormattingCheck[] {
  const facts = file?.format === "docx" || file?.format === "pdf" ? file : null;
  const layout = facts
    ? [tables(facts), headerFooter(facts), images(facts), columns(facts), textBoxes(facts), fonts(facts)]
    : [];
  return [...layout, specialCharacters(facts, resume.text), headingNames(resume)].filter((c) => c !== null);
}
