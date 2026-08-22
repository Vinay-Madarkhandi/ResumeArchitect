import type { ResumeContent } from "@/lib/schemas/resume";

function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\b(inc|llc|corp|corporation|ltd|co|company)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Defense in depth beyond prompting. Company/employer names should never
 * legitimately vary between the source and a tailored resume, unlike skill
 * phrasing (e.g. "JavaScript" -> "JS"), which is expected and desirable
 * rewording — so only company names are checked here, and any new one is
 * treated as fabrication (hard fail, no resume row is ever created for it).
 */
export function findFabricatedCompanies(source: ResumeContent, tailored: ResumeContent): string[] {
  const sourceCompanies = new Set(
    source.experience.map((e) => normalizeCompanyName(e.company)).filter(Boolean),
  );

  const fabricated = new Set<string>();
  for (const entry of tailored.experience) {
    const normalized = normalizeCompanyName(entry.company);
    if (normalized && !sourceCompanies.has(normalized)) {
      fabricated.add(entry.company);
    }
  }
  return [...fabricated];
}
