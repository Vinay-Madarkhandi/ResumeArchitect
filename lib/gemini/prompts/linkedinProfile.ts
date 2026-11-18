import { generateStructured, type JsonModel } from "@/lib/gemini/model";
import { LINKEDIN } from "@/lib/career/linkedin";
import { LinkedInDraftSchema, type LinkedInProfile, type LinkedInSuggestions } from "@/lib/schemas/career";
import type { JobAnalysis } from "@/lib/schemas/jobAnalysis";
import { verifyChange } from "@/lib/tailoring/verify";

const SYSTEM = `You rewrite a candidate's LinkedIn headline and About section so recruiters
searching for their target role find them. You get their resume (Markdown),
their current LinkedIn sections, and, when they have one, the target role's
requirements.

Hard rules:
1. Use only facts from the resume and the current profile. Never invent
   employers, titles, numbers, projects, skills, or credentials. Never add a
   metric neither source states.
2. If the target asks for something neither source shows, leave it out and
   mention it in notes as a gap to address honestly.
3. No clichés ("passionate", "results-driven", "guru", "ninja", "synergy").

Return:
- headlines: 3 alternative headlines, each at most ${LINKEDIN.headlineMax} characters. Lead
  with the role they want, then 2–4 skills or domains the target needs that
  they really have, then one concrete proof point. Separate parts with " | ".
- about: one About section of 1,200–2,200 characters in first person, plain
  text, short paragraphs separated by blank lines. The first two sentences
  must name the target role and its most important skill they have. Then
  2–3 concrete results from the resume, then what they're looking for.
- notes: up to 4 short, specific tips for the rest of their profile (skills to
  add that the resume shows, experience lines to quantify, gaps).`;

export interface LinkedInSuggestionInput {
  profile: LinkedInProfile;
  resumeMarkdown: string;
  job: JobAnalysis | null;
}

export async function suggestLinkedIn(model: JsonModel, input: LinkedInSuggestionInput): Promise<LinkedInSuggestions> {
  const { profile, resumeMarkdown, job } = input;
  const prompt = [
    job
      ? `# Target role\n${job.title}${job.company ? ` at ${job.company}` : ""}\n${job.summary}\n\n# Requirements\n${job.requirements
          .map((r) => `- ${r.label} (${r.importance === "must" ? "must-have" : "nice-to-have"})`)
          .join("\n")}${job.keywords.length ? `\n\n# Keywords\n${job.keywords.map((k) => `- ${k.term}`).join("\n")}` : ""}`
      : "# Target role\nNone given. Aim at the role their resume most clearly supports.",
    `# Current LinkedIn headline\n${profile.headline || "(empty)"}`,
    `# Current About section\n${profile.about || "(empty)"}`,
    `# Current skills\n${profile.skills || "(empty)"}`,
    `# Candidate's resume\n${resumeMarkdown}`,
  ].join("\n\n");

  const draft = await generateStructured(model, {
    label: "linkedinProfile",
    system: SYSTEM,
    prompt,
    schema: LinkedInDraftSchema,
    temperature: 0.6,
  });

  // The same proof the tailoring pipeline runs: anything the resume and the
  // profile can't back up is flagged on the suggestion for the user to check.
  const source = [resumeMarkdown, profile.headline, profile.about, profile.experience, profile.skills].join("\n");
  const proofJob: JobAnalysis = job ?? { title: "", company: null, seniority: null, summary: "", requirements: [], keywords: [] };
  const proof = (text: string) => ({
    text,
    flags: verifyChange({ id: "suggestion", op: "insert_after", before: null, after: text, reason: "", requirementIds: [] }, source, proofJob),
  });

  return {
    headlines: draft.headlines.map((h) => proof(h.replace(/\s+/g, " "))),
    about: proof(draft.about),
    notes: draft.notes.map((n) => n.trim()).filter(Boolean),
  };
}
