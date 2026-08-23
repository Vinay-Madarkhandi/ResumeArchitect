import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getDocumentProxy } from "unpdf";
import { createClient } from "@/utils/supabase/server";
import { DocumentContentSchema } from "@/lib/schemas/document";
import { DocumentPdf } from "@/lib/pdf/docToPdfTree";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Live page-count for the editor header ("≈2 pages") — the editor canvas
 * is a continuous scroll with no page-break visuals (removing the old
 * PDFViewer in favor of a WYSIWYG canvas meant losing that cue too), so
 * this is how a user can still tell how long their resume will actually
 * print as, without us trying to fake pixel-perfect page breaks in HTML
 * against a completely different rendering engine than the real PDF.
 * Renders the *live* (possibly unsaved) editor content posted by the
 * client, not whatever's currently persisted in the DB.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { data: resume } = await supabase.from("resumes").select("id").eq("id", id).eq("user_id", user.id).single();
  if (!resume) return NextResponse.json({ error: "Resume not found." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = DocumentContentSchema.safeParse(body?.content);
  if (!parsed.success) return NextResponse.json({ error: "Invalid content." }, { status: 400 });

  try {
    const buffer = await renderToBuffer(<DocumentPdf doc={parsed.data} />);
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    return NextResponse.json({ pageCount: pdf.numPages });
  } catch {
    return NextResponse.json({ error: "Couldn't count pages." }, { status: 500 });
  }
}
