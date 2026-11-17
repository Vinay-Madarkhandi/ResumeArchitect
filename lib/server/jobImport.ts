import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Imports a job post from a URL: fetches the page server-side (guarded
 * against reaching private networks), then pulls the posting text from
 * JSON-LD JobPosting data when the page has it (most ATS job boards do), or
 * from the readable page text otherwise.
 */

export class JobImportError extends Error {}

const MAX_BYTES = 2_000_000;
const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;

/** True for loopback, private, link-local, CGNAT, multicast and other non-public addresses. */
export function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  const v6 = ip.toLowerCase();
  if (v6 === "::" || v6 === "::1") return true;
  if (v6.startsWith("::ffff:")) return isPrivateAddress(v6.slice(7));
  return /^(fc|fd|fe8|fe9|fea|feb|ff)/.test(v6);
}

async function assertPublic(url: URL) {
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new JobImportError("Use an http or https link.");
  if (url.username || url.password) throw new JobImportError("That link isn't supported.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
  if (addresses.length === 0) throw new JobImportError("That site couldn't be found. Check the link.");
  if (addresses.some((a) => isPrivateAddress(a.address))) throw new JobImportError("That link isn't supported.");
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}

/** HTML fragment → readable text with paragraph and list breaks preserved. */
export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style|noscript|svg|nav|footer|header|form)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<li[^>]*>/gi, "\n- ")
      .replace(/<\/(p|div|section|h[1-6]|ul|ol|li|tr)>|<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export interface ImportedJob {
  text: string;
  title: string | null;
  company: string | null;
}

function findJobPosting(node: unknown): Record<string, unknown> | null {
  if (Array.isArray(node)) {
    for (const n of node) {
      const hit = findJobPosting(n);
      if (hit) return hit;
    }
    return null;
  }
  if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    const type = obj["@type"];
    if (type === "JobPosting" || (Array.isArray(type) && type.includes("JobPosting"))) return obj;
    if (obj["@graph"]) return findJobPosting(obj["@graph"]);
  }
  return null;
}

/** Extracts the posting from a page: JSON-LD JobPosting first, then the main readable text. */
export function extractJob(html: string): ImportedJob {
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const posting = findJobPosting(JSON.parse(m[1].trim()));
      if (posting && typeof posting.description === "string") {
        const org = posting.hiringOrganization as Record<string, unknown> | undefined;
        return {
          text: htmlToText(decodeEntities(posting.description)),
          title: typeof posting.title === "string" ? decodeEntities(posting.title) : null,
          company: typeof org?.name === "string" ? decodeEntities(org.name) : null,
        };
      }
    } catch {
      // Malformed JSON-LD; try the next block or fall back to page text.
    }
  }
  const main = /<main[\s\S]*?<\/main>/i.exec(html)?.[0] ?? /<body[\s\S]*<\/body>/i.exec(html)?.[0] ?? html;
  const title = /<title>([\s\S]*?)<\/title>/i.exec(html)?.[1];
  return { text: htmlToText(main), title: title ? decodeEntities(title).trim() : null, company: null };
}

export async function importJobFromUrl(raw: string): Promise<ImportedJob> {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new JobImportError("That doesn't look like a link.");
  }
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublic(url);
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ResumeArchitect job import)", Accept: "text/html" },
    }).catch(() => {
      throw new JobImportError("Couldn't reach that page. Paste the job post instead.");
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = new URL(res.headers.get("location")!, url);
      continue;
    }
    if (!res.ok) throw new JobImportError("That site didn't share the page (it may need a login). Paste the job post instead.");
    const length = Number(res.headers.get("content-length") ?? 0);
    if (length > MAX_BYTES) throw new JobImportError("That page is too large to import.");
    const html = (await res.text()).slice(0, MAX_BYTES);
    const job = extractJob(html);
    if (job.text.length < 200) throw new JobImportError("Couldn't find the job post on that page. Paste it instead.");
    return { ...job, text: job.text.slice(0, 20_000) };
  }
  throw new JobImportError("That link redirects too many times.");
}
