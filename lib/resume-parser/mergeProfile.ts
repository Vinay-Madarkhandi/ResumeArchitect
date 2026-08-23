import type { PersonalInfo, ResumeContent, Link } from "@/lib/schemas/resume";

/** Fills gaps the PDF parser left in personalInfo with what the user already
 * entered in their profile (onboarding step 2 runs before upload), rather
 * than leaving fields empty the user has already told us. Never overwrites
 * something the parser did find. */
export function mergeParsedContentWithProfile(
  content: ResumeContent,
  profile: { fullName?: string | null; headline?: string | null; email?: string | null; phone?: string | null; location?: string | null; links?: Link[] | null },
): ResumeContent {
  const personalInfo: PersonalInfo = {
    ...content.personalInfo,
    fullName: content.personalInfo.fullName || profile.fullName || "",
    headline: content.personalInfo.headline || profile.headline || undefined,
    email: content.personalInfo.email || profile.email || undefined,
    phone: content.personalInfo.phone || profile.phone || undefined,
    location: content.personalInfo.location || profile.location || undefined,
    links: content.personalInfo.links.length > 0 ? content.personalInfo.links : profile.links ?? [],
  };
  return { ...content, personalInfo };
}
