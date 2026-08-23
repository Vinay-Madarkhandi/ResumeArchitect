import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/utils/supabase/server";
import { resolveDocument } from "@/lib/documentConversion";
import { DocumentPdf } from "@/lib/pdf/docToPdfTree";
import { RESUME_EXPORTS_BUCKET, exportedPdfPath } from "@/lib/storage/paths";

export const runtime = "nodejs";
export const maxDuration = 60;

const SIGNED_URL_TTL_SECONDS = 60;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { data: resume } = await supabase
    .from("resumes")
    .select("pdf_storage_path, pdf_generated_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!resume?.pdf_storage_path) {
    return NextResponse.json({ error: "This resume hasn't been exported yet." }, { status: 404 });
  }

  const { data: signed, error } = await supabase.storage
    .from(RESUME_EXPORTS_BUCKET)
    .createSignedUrl(resume.pdf_storage_path, SIGNED_URL_TTL_SECONDS);

  if (error || !signed) {
    return NextResponse.json({ error: "Couldn't retrieve the exported PDF." }, { status: 500 });
  }

  // Reached via a plain <a href> download link (e.g. from the Library), so
  // redirect straight to the signed URL rather than returning JSON.
  return NextResponse.redirect(signed.signedUrl);
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { data: resume } = await supabase
    .from("resumes")
    .select("id, user_id, content")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!resume) return NextResponse.json({ error: "Resume not found." }, { status: 404 });

  const doc = resolveDocument(resume.content);
  if (!doc) {
    return NextResponse.json({ error: "This resume's content looks corrupted. Please open and re-save it first." }, { status: 422 });
  }

  let buffer: Buffer;
  try {
    buffer = await renderToBuffer(<DocumentPdf doc={doc} />);
  } catch {
    return NextResponse.json({ error: "Couldn't generate the PDF. Please try again." }, { status: 500 });
  }

  const storagePath = exportedPdfPath(user.id, resume.id);
  const { error: uploadError } = await supabase.storage
    .from(RESUME_EXPORTS_BUCKET)
    .upload(storagePath, buffer, { contentType: "application/pdf", upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: "Couldn't save the exported PDF. Please try again." }, { status: 500 });
  }

  const pdfGeneratedAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("resumes")
    .update({ pdf_storage_path: storagePath, pdf_generated_at: pdfGeneratedAt })
    .eq("id", resume.id);

  if (updateError) {
    return NextResponse.json({ error: "Couldn't save the exported PDF. Please try again." }, { status: 500 });
  }

  const { data: signed, error: signError } = await supabase.storage
    .from(RESUME_EXPORTS_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

  if (signError || !signed) {
    return NextResponse.json({ error: "The PDF was saved but couldn't be retrieved. Please try downloading again." }, { status: 500 });
  }

  return NextResponse.json({ signedUrl: signed.signedUrl, pdfGeneratedAt });
}
