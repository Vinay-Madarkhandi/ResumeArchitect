import { generateStructured, type JsonModel } from "@/lib/gemini/model";
import { LINKEDIN } from "@/lib/career/linkedin";
import { LinkedInDraftSchema, type LinkedInProfile, type LinkedInSuggestions } from "@/lib/schemas/career";
import type { JobAnalysis } from "@/lib/schemas/jobAnalysis";
import { checkGrounding } from "@/lib/grounding";

const SYSTEM = `You rewrite a candidate's LinkedIn headline and About section so recruiters
searching for their target role find them. You get their resume (Markdown),
their current LinkedIn sections, and, when they have one, the target role's
requirements.

Hard rules:
1. Use only facts from the resume. Never invent
   employers, titles, numbers, projects, skills, or credentials. Never add a
   metric or move a figure to a different achievement.
2. If the target asks for something the resume doesn't show, leave it out.
3. No clichés ("passionate", "results-driven", "guru", "ninja", "synergy").

Return:
- headlines: 3 alternative headlines, each at most ${LINKEDIN.headlineMax} characters. Lead
  with the role their resume shows, then skills or domains the target needs that
  they really have, then one concrete proof point. Separate parts with " | ".
- about: one About section of 1,200–2,200 characters in first person, plain
  text, short paragraphs separated by blank lines. The first two sentences
  must name a role and skill their resume already shows. Then
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
    `# Current experience\n${profile.experience || "(empty)"}`,
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

  const proof = (item: string | { text: string; cites?: number[] }) => {
    const textStr = typeof item === "string" ? item : item.text;
    const cites = typeof item === "string" ? undefined : item.cites;
    const checked = checkGrounding([resumeMarkdown], textStr, { cites });
    return { text: checked.text, flags: checked.flags };
  };
  const aboutStr = typeof draft.about === "string"
    ? draft.about
    : Array.isArray(draft.about)
      ? draft.about.map((a) => a.text).join("\n\n")
      : draft.about.text;
  const aboutCites = typeof draft.about === "object" && !Array.isArray(draft.about) ? draft.about.cites : undefined;

  return {
    headlines: draft.headlines.map((h) => {
      const text = typeof h === "string" ? h.replace(/\s+/g, " ") : h.text.replace(/\s+/g, " ");
      const cites = typeof h === "string" ? undefined : h.cites;
      return proof({ text, cites });
    }),
    about: proof({ text: aboutStr, cites: aboutCites }),
    notes: draft.notes.map((n) => proof(n)),
    grounded: true,
  };
}
