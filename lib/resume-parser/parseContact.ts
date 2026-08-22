import type { ResumeLine } from "./extractLines";
import { EMAIL_RE, PHONE_RE, URL_RE } from "./patterns";
import type { Link, PersonalInfo } from "@/lib/schemas/resume";

function linkLabel(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes("linkedin.com")) return "LinkedIn";
  if (lower.includes("github.com")) return "GitHub";
  return "Website";
}

/**
 * Parses the block of lines before the first recognized section header into
 * name / headline / email / phone / location / links. The name is assumed
 * to be the largest-font line that isn't itself contact info; everything
 * else is regex extraction. Fields that can't be found are left empty
 * rather than guessed.
 */
export function parseContactBlock(headerLines: ResumeLine[]): {
  personalInfo: PersonalInfo;
  lowConfidenceFields: string[];
} {
  const lowConfidenceFields: string[] = [];
  const links: Link[] = [];
  let email: string | undefined;
  let phone: string | undefined;

  const candidateNameLines: ResumeLine[] = [];

  for (const line of headerLines) {
    const emailMatch = line.text.match(EMAIL_RE);
    if (emailMatch && !email) email = emailMatch[0];

    const phoneMatch = line.text.match(PHONE_RE);
    if (phoneMatch && !phone && phoneMatch[0].replace(/\D/g, "").length >= 7) {
      phone = phoneMatch[0].trim();
    }

    const urlMatches = line.text.match(new RegExp(URL_RE, "gi"));
    if (urlMatches) {
      for (const url of urlMatches) {
        links.push({ label: linkLabel(url), url: url.replace(/[.,;]$/, "") });
      }
    }

    const isPureContactLine = emailMatch || phoneMatch || urlMatches;
    if (!isPureContactLine) candidateNameLines.push(line);
  }

  candidateNameLines.sort((a, b) => b.maxFontSize - a.maxFontSize);
  const nameLine = candidateNameLines[0];
  const fullName = nameLine?.text ?? "";
  if (!fullName) lowConfidenceFields.push("personalInfo.fullName");

  // The next-largest non-name line is a reasonable guess at a headline
  // ("Senior Product Designer"), but only when it's short — long lines are
  // more likely a location/summary fragment than a title.
  const headlineCandidate = candidateNameLines.find(
    (l) => l !== nameLine && l.text.length <= 60 && l.text.length >= 3,
  );
  const headline = headlineCandidate?.text;
  if (!headline) lowConfidenceFields.push("personalInfo.headline");

  if (!email) lowConfidenceFields.push("personalInfo.email");
  if (!phone) lowConfidenceFields.push("personalInfo.phone");
  if (links.length === 0) lowConfidenceFields.push("personalInfo.links");

  // Location: a short remaining line containing a comma (e.g. "Austin, TX")
  // that isn't the name or the headline.
  const locationCandidate = headerLines.find((l) => {
    if (l === nameLine || l === headlineCandidate) return false;
    if (EMAIL_RE.test(l.text) || PHONE_RE.test(l.text) || new RegExp(URL_RE).test(l.text)) return false;
    return /,/.test(l.text) && l.text.length <= 60;
  });
  const location = locationCandidate?.text;
  if (!location) lowConfidenceFields.push("personalInfo.location");

  return {
    personalInfo: { fullName, headline, email, phone, location, links },
    lowConfidenceFields,
  };
}
