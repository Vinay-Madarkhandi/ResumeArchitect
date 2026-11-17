import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/utils/supabase/server";
import { resolveDocument } from "@/lib/documentConversion";
import { DocumentPdf } from "@/lib/pdf/docToPdfTree";
import { documentToDocx } from "@/lib/docx/docToDocx";
import { DocumentContentSchema, type DocumentContent } from "@/lib/schemas/document";
import { getTemplate } from "@/lib/resume/templates";

export const runtime = "nodejs";
export const maxDuration = 60;

type Format = "pdf" | "docx";

function fileName(title: string, format: Format): string {
  const base = title.replace(/[^\p{L}\p{N} _.-]+/gu, " ").replace(/\s+/g, " ").trim().slice(0, 80) || "Resume";
  return `${base}.${format}`;
}

async function render(doc: DocumentContent, format: Format, templateId: string | null, title: string) {
  const template = getTemplate(templateId);
  const body =
    format === "pdf"
      ? await renderToBuffer(<DocumentPdf doc={doc} template={template} title={title} />)
      : await documentToDocx(doc, template, title);
  const name = fileName(title, format);
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type":
        format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${name.replace(/"/g, "")}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "no-store",
    },
  });
}

async function load(id: string) {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("resumes")
    .select("id, title, content, template")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  return data;
}

function parseFormat(value: unknown): Format | null {
  return value === "pdf" || value === "docx" ? value : null;
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
    return await render(doc, format, resume.template, resume.title);
  } catch {
    return NextResponse.json({ error: "Couldn't build the file. Try again." }, { status: 500 });
  }
}

/**
 * Downloads exactly what the editor shows, including edits not saved yet.
 * Body: { format, content, template? }
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const format = parseFormat(body?.format);
  const parsed = DocumentContentSchema.safeParse(body?.content);
  if (!format || !parsed.success) return NextResponse.json({ error: "Invalid export request." }, { status: 400 });
  const resume = await load(id);
  if (!resume) return NextResponse.json({ error: "Resume not found." }, { status: 404 });
  try {
    return await render(parsed.data, format, typeof body?.template === "string" ? body.template : resume.template, resume.title);
  } catch {
    return NextResponse.json({ error: "Couldn't build the file. Try again." }, { status: 500 });
  }
}
