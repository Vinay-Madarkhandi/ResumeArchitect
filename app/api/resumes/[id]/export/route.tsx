import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/utils/supabase/server";
import { resolveDocument } from "@/lib/documentConversion";
import { DocumentPdf, LetterPdf } from "@/lib/pdf/docToPdfTree";
import { documentToDocx, letterToDocx } from "@/lib/docx/docToDocx";
import { DocumentContentSchema, type DocumentContent } from "@/lib/schemas/document";
import { getTemplate } from "@/lib/resume/templates";
import { DesignMismatchError, patchDocx } from "@/lib/docx/inPlace";
import { RESUME_UPLOADS_BUCKET } from "@/lib/storage/paths";

export const runtime = "nodejs";
export const maxDuration = 60;

/** "design" is the user's own Word file with the current wording written into it. */
type Format = "pdf" | "docx" | "design";

const DOCX_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function fileName(title: string, format: "pdf" | "docx"): string {
  const base = title.replace(/[^\p{L}\p{N} _.-]+/gu, " ").replace(/\s+/g, " ").trim().slice(0, 80) || "Resume";
  return `${base}.${format}`;
}

type Body = { kind: "resume"; doc: DocumentContent } | { kind: "letter"; text: string };

function download(bytes: Uint8Array, name: string, type: string) {
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": type,
      "Content-Disposition": `attachment; filename="${name.replace(/"/g, "")}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "no-store",
    },
  });
}

async function render(body: Body, format: "pdf" | "docx", templateId: string | null, title: string) {
  const template = getTemplate(templateId);
  const bytes =
    body.kind === "letter"
      ? format === "pdf"
        ? await renderToBuffer(<LetterPdf text={body.text} template={template} title={title} />)
        : await letterToDocx(body.text, template, title)
      : format === "pdf"
        ? await renderToBuffer(<DocumentPdf doc={body.doc} template={template} title={title} />)
        : await documentToDocx(body.doc, template, title);
  return download(new Uint8Array(bytes), fileName(title, format), format === "pdf" ? "application/pdf" : DOCX_TYPE);
}

async function load(id: string) {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("resumes")
    .select("id, title, content, template, design_source_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  return data ? { ...data, supabase } : null;
}

type Loaded = NonNullable<Awaited<ReturnType<typeof load>>>;

async function renderDesign(resume: Loaded, doc: DocumentContent): Promise<Response> {
  if (!resume.design_source_path) {
    return NextResponse.json({ error: "This resume wasn't imported from a Word file." }, { status: 409 });
  }
  const { data: file } = await resume.supabase.storage.from(RESUME_UPLOADS_BUCKET).download(resume.design_source_path);
  if (!file) return NextResponse.json({ error: "Your original Word file is no longer stored. Upload it again." }, { status: 409 });
  try {
    const bytes = await patchDocx(await file.arrayBuffer(), doc);
    return download(bytes, fileName(resume.title, "docx"), DOCX_TYPE);
  } catch (error) {
    if (error instanceof DesignMismatchError) return NextResponse.json({ error: error.message }, { status: 409 });
    throw error;
  }
}

function parseFormat(value: unknown): Format | null {
  return value === "pdf" || value === "docx" || value === "design" ? value : null;
}

/** Downloads the saved resume (used from the dashboard). ?format=pdf|docx */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const format = parseFormat(new URL(request.url).searchParams.get("format") ?? "pdf");
  if (!format) return NextResponse.json({ error: "Unknown format." }, { status: 400 });
  const resume = await load(id);
  if (!resume) return NextResponse.json({ error: "Resume not found." }, { status: 404 });
  const doc = resolveDocument(resume.content);
  if (!doc) return NextResponse.json({ error: "This resume couldn't be read." }, { status: 422 });
  try {
    if (format === "design") return await renderDesign(resume, doc);
    return await render({ kind: "resume", doc }, format, resume.template, resume.title);
  } catch {
    return NextResponse.json({ error: "Couldn't build the file. Try again." }, { status: 500 });
  }
}

/**
 * Downloads exactly what the editor shows, including edits not saved yet.
 * Body: { format, content, template? } for the resume, or
 * { format, kind: "letter", text, template? } for the cover letter.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const format = parseFormat(body?.format);
  if (!format) return NextResponse.json({ error: "Invalid export request." }, { status: 400 });
  const resume = await load(id);
  if (!resume) return NextResponse.json({ error: "Resume not found." }, { status: 404 });
  const template = typeof body?.template === "string" ? body.template : resume.template;
  try {
    if (body?.kind === "letter") {
      if (format === "design") return NextResponse.json({ error: "Invalid export request." }, { status: 400 });
      const text = typeof body.text === "string" ? body.text.slice(0, 20_000) : "";
      if (!text.trim()) return NextResponse.json({ error: "The letter is empty." }, { status: 400 });
      return await render({ kind: "letter", text }, format, template, `${resume.title} — Cover letter`);
    }
    const parsed = DocumentContentSchema.safeParse(body?.content);
    if (!parsed.success) return NextResponse.json({ error: "Invalid export request." }, { status: 400 });
    if (format === "design") return await renderDesign(resume, parsed.data);
    return await render({ kind: "resume", doc: parsed.data }, format, template, resume.title);
  } catch {
    return NextResponse.json({ error: "Couldn't build the file. Try again." }, { status: 500 });
  }
}
