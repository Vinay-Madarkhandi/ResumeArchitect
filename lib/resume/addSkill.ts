import type { DocumentContent } from "@/lib/schemas/document";
import { fromUnits, toUnits, unitFromMarkdown, withMarkdown } from "@/lib/resume/units";

/**
 * Adds a skill the user confirmed they have: appended to the last line of
 * the Skills section, or a new Skills section at the end if there is none.
 */
export function addSkill(doc: DocumentContent, label: string): DocumentContent {
  const units = toUnits(doc);
  const heading = units.findIndex((u) => u.kind === "heading" && /skill/i.test(u.text));
  if (heading === -1) {
    return fromUnits([...units, unitFromMarkdown("heading", "Skills", { level: 2 }), unitFromMarkdown("paragraph", label)]);
  }
  let last = heading;
  for (let i = heading + 1; i < units.length && units[i].kind !== "heading"; i++) last = i;
  if (last === heading) {
    units.splice(heading + 1, 0, unitFromMarkdown("paragraph", label));
  } else {
    const line = units[last];
    const sep = /[,;·|]\s*\S/.test(line.text) ? (line.text.includes("·") ? " · " : ", ") : ", ";
    units[last] = withMarkdown(line, `${line.markdown.replace(/[.\s]+$/, "")}${sep}${label}`);
  }
  return fromUnits(units);
}
