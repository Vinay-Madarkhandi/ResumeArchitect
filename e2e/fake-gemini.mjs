// A stand-in for the Gemini REST API, used only by the end-to-end tests
// (the app points at it with GEMINI_API_BASE_URL). It answers the three
// structured prompts deterministically from the request content, so the
// whole pipeline runs for real without a Google key or network.
import http from "node:http";

const PORT = Number(process.env.FAKE_GEMINI_PORT ?? 4010);
// Optional latency, to look at the in-progress pipeline UI.
const DELAY_MS = Number(process.env.FAKE_GEMINI_DELAY_MS ?? 0);

const JOB = {
  title: "Senior Backend Engineer",
  company: "Northwind Payments",
  seniority: "Senior",
  summary: "Own the payments platform end to end. Lead reliability and mentor engineers.",
  requirements: [
    { id: "go", label: "Go", aliases: ["Golang"], importance: "must", category: "skill" },
    { id: "postgres", label: "PostgreSQL", aliases: ["Postgres"], importance: "must", category: "tool" },
    { id: "kafka", label: "Kafka", aliases: [], importance: "must", category: "tool" },
    { id: "incident", label: "Incident response", aliases: ["on-call"], importance: "must", category: "skill" },
    { id: "k8s", label: "Kubernetes", aliases: ["K8s"], importance: "nice", category: "tool" },
    { id: "mentoring", label: "Mentoring", aliases: ["mentored"], importance: "nice", category: "soft" },
  ],
  keywords: [
    { term: "payments", aliases: ["payment"] },
    { term: "reliability", aliases: [] },
    { term: "latency", aliases: [] },
  ],
};

function tailor(prompt) {
  const lines = [...prompt.matchAll(/^\[(\d+)\] \(([^)]+)\) (.*)$/gm)].map((m) => ({ n: Number(m[1]), kind: m[2], text: m[3] }));
  const bullets = lines.filter((l) => l.kind === "bullet");
  const edits = [];
  if (bullets[0]) {
    edits.push({
      op: "rewrite",
      line: bullets[0].n,
      text: bullets[0].text.replace(/^(Worked on|Helped with|Responsible for)\s*/i, "Led ").replace(/services/i, "payment services"),
      reason: "The posting centers on payments; this bullet now says so up front.",
      requirementIds: ["go"],
    });
  }
  if (bullets[1]) {
    edits.push({
      op: "rewrite",
      line: bullets[1].n,
      text: `${bullets[1].text.replace(/\.$/, "")}, improving reliability for 2M daily transactions`,
      reason: "Ties the work to reliability, a stated priority.",
      requirementIds: [],
    });
  }
  const skills = lines.findIndex((l) => /skills/i.test(l.text) && l.kind.startsWith("heading"));
  if (skills >= 0 && lines[skills + 1]) {
    edits.push({
      op: "rewrite",
      line: lines[skills + 1].n,
      text: `${lines[skills + 1].text}, Kubernetes`,
      reason: "Kubernetes is listed as a plus.",
      requirementIds: ["k8s"],
    });
  }
  if (bullets[2]) {
    edits.push({ op: "insert_after", line: bullets[2].n, text: "Mentored engineers through on-call rotations", reason: "Shows mentoring.", requirementIds: ["mentoring"] });
  }
  return { summary: "Leads with payments and reliability, and surfaces mentoring the posting asks for.", edits };
}

function parse(prompt) {
  const text = prompt.split("# Extracted resume text")[1]?.trim() ?? "";
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const md = lines
    .map((l, i) => (i === 0 ? `# ${l}` : /^(experience|education|skills|summary|projects)$/i.test(l) ? `## ${l}` : /^[-•]/.test(l) ? `- ${l.replace(/^[-•]\s*/, "")}` : l))
    .join("\n\n");
  return { title: `${lines[0] ?? "Resume"} — Master`, markdown: md };
}

function answer(system, prompt) {
  if (system.includes("senior technical recruiter")) return JOB;
  if (system.includes("numbered lines")) return tailor(prompt);
  if (system.includes("convert text extracted")) return parse(prompt);
  if (system.includes("write cover letters")) {
    const name = prompt.split("# Candidate's resume")[1]?.match(/^# (.+)$/m)?.[1] ?? "Candidate";
    return {
      letter: `Dear Hiring Manager,\n\nI'm applying for the Senior Backend Engineer role. I build payment services in Go on PostgreSQL.\n\nAt Analytical Engines I built a Kafka pipeline that cut invoice latency by 38%, and I ran the on-call rotation.\n\nI'd welcome a conversation.\n\n${name}`,
    };
  }
  if (system.includes("one specific piece of text")) {
    const selected = prompt.split("# Selected text to rewrite")[1]?.split("#")[0]?.trim() ?? "";
    return { replacementText: `${selected} (sharpened)`, flagged: false, flagReason: null };
  }
  return {};
}

http
  .createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      res.setHeader("Content-Type", "application/json");
      if (req.url?.includes("BADKEY") || req.headers["x-goog-api-key"] === "AIzaBADKEY") {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: { code: 400, message: "API key not valid.", status: "INVALID_ARGUMENT" } }));
      }
      if (req.method === "GET") {
        return res.end(JSON.stringify({ name: "models/gemini-2.5-flash", displayName: "Gemini 2.5 Flash" }));
      }
      const json = JSON.parse(body || "{}");
      const system = json.systemInstruction?.parts?.map((p) => p.text).join("\n") ?? json.system_instruction?.parts?.map((p) => p.text).join("\n") ?? "";
      const prompt = json.contents?.flatMap((c) => c.parts.map((p) => p.text)).join("\n") ?? "";
      const out = answer(system, prompt);
      setTimeout(() => res.end(JSON.stringify({ candidates: [{ content: { role: "model", parts: [{ text: JSON.stringify(out) }] }, finishReason: "STOP" }] })), DELAY_MS);
    });
  })
  .listen(PORT, () => console.log(`fake gemini on ${PORT}`));
