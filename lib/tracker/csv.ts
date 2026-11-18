import { jobSchema, historySchema, type JobInput, type JobRecord, type StageChange } from "./schema";

const headers = [
  "title", "company", "location", "salary", "url", "description", "stage", "notes",
  "contacts", "interviews", "followUp", "excitement", "archived", "history",
] as const;
export const maxCsvBytes = 2_000_000;
const maxImportJobs = 500;

function quote(value: string) {
  // Protect spreadsheet users from formulas. An exported leading apostrophe
  // is doubled so importing a ResumeArchitect export recovers the literal.
  const text = /^(?:'|[\t\r\n]|\s*[=+@-])/.test(value) ? "'" + value : value;
  return '"' + text.replaceAll('"', '""') + '"';
}

export function exportJobsCsv(jobs: JobRecord[]) {
  return [headers.join(","), ...jobs.map((job) => headers.map((key) => {
    const value = job[key];
    return quote(Array.isArray(value) ? JSON.stringify(value) : String(value ?? ""));
  }).join(","))].join("\r\n") + "\r\n";
}

function rowsFromCsv(csv: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let state: "start" | "plain" | "quoted" | "closed" = "start";
  const endCell = () => {
    row.push(cell);
    cell = "";
    state = "start";
  };
  const endRow = () => {
    endCell();
    if (row.some((value) => value !== "")) rows.push(row);
    row = [];
  };

  const text = csv.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (state === "quoted") {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') state = "closed";
      else cell += ch;
    } else if (ch === ",") endCell();
    else if (ch === "\r" || ch === "\n") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      endRow();
      if (rows.length > maxImportJobs + 1) throw new Error(`Import up to ${maxImportJobs} jobs at a time.`);
    } else if (ch === '"' && state === "start") state = "quoted";
    else {
      if (state === "closed" || ch === '"') throw new Error("The CSV contains an invalid quoted field.");
      cell += ch;
      state = "plain";
    }
  }
  if (state === "quoted") throw new Error("The CSV contains an unclosed quoted field.");
  if (row.length || cell || state === "closed") endRow();
  return rows;
}

type ImportedJob = JobInput & { archived: boolean; history?: StageChange[] };

export function importJobsCsv(csv: string): ImportedJob[] {
  if (new TextEncoder().encode(csv).byteLength > maxCsvBytes) throw new Error("Choose a CSV file under 2 MB.");
  const [header = [], ...rows] = rowsFromCsv(csv);
  const columns = header.map((name) => name.trim().toLowerCase().replaceAll(/[_ -]/g, ""));
  if (!columns.includes("title") || columns.some((name, index) => columns.indexOf(name) !== index)) {
    throw new Error("Use a CSV with a title column and unique column names.");
  }
  if (!rows.length || rows.length > maxImportJobs) throw new Error(`Include 1 to ${maxImportJobs} jobs per CSV.`);
  const ownExport = header.join(",") === headers.join(",");
  return rows.map((row, index) => {
    try {
      if (row.length !== columns.length) throw new Error("Column count differs from the header.");
      const entries = Object.fromEntries(columns.map((key, i) => [
        key, ownExport && row[i].startsWith("'") ? row[i].slice(1) : row[i],
      ]));
      const { title, company, location, salary, url, description, stage, notes, contacts, interviews, followup, excitement, archived, history } = entries;
      const job = jobSchema.safeParse({
        title, company, location, salary, url, description, notes,
        stage: stage?.trim().toLowerCase() || undefined,
        contacts: contacts ? JSON.parse(contacts) : undefined,
        interviews: interviews ? JSON.parse(interviews) : undefined,
        followUp: followup || null,
        excitement: excitement ? Number(excitement) : null,
      });
      if (!job.success) throw new Error(`Invalid ${job.error.issues[0].path.join(".") || "job"}.`);
      if (archived && !/^(true|false)$/i.test(archived)) throw new Error("Archived must be true or false.");
      const parsedHistory = history ? historySchema.safeParse(JSON.parse(history)) : undefined;
      if (parsedHistory && (!parsedHistory.success || parsedHistory.data.at(-1)?.stage !== job.data.stage)) {
        throw new Error("Stage history must end at the current stage.");
      }
      return { ...job.data, archived: archived?.toLowerCase() === "true", history: parsedHistory?.data };
    } catch (error) {
      const message = error instanceof SyntaxError ? "Invalid JSON in contacts, interviews or history." : (error as Error).message;
      throw new Error(`CSV row ${index + 2}: ${message}`);
    }
  });
}
