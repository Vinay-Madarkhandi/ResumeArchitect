import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { extractText, getDocumentProxy } from "unpdf";
import { createClient } from "@/utils/supabase/server";
import { DocumentContentSchema } from "@/lib/schemas/document";
import { DocumentPdf } from "@/lib/pdf/docToPdfTree";

export const runtime = "nodejs";
export const maxDuration = 30;

const ANCHOR_WORD_COUNT = 8;

/** The last few words of a page's extracted text — short enough to find
 * reliably in the live document (lib/editor/pageBreakExtension.ts), long
 * enough to be unlikely to match anywhere else in a normal resume. */
function pageEndAnchor(pageText: string): string {
  const words = pageText.replace(/\s+/g, " ").trim().split(" ");
  return words.slice(-ANCHOR_WORD_COUNT).join(" ");
}

/**
 * Live page-count and page-break markers for the editor — renders the
 * actual PDF pipeline server-side (real pagination) rather than trying to
 * approximate it purely in the HTML canvas, which lays out text with a
 * completely different engine at a completely different (and, since the
 * canvas is now user-resizable, not even fixed) width than the exported
 * PDF. Instead of only reporting a count, this also extracts each page's
 * real text and returns the tail of every page but the last — the editor
 * locates that text in the live document and draws a marker after it, an
 * honest "this is roughly where a new page starts" rather than a false-
 * precision line through an exact character. Renders the *live* (possibly
 * unsaved) editor content posted by the client, not whatever's currently
 * persisted in the DB.
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
    const pageCount = pdf.numPages;

    let pageBreakAnchors: string[] = [];
    if (pageCount > 1) {
      const { text } = await extractText(pdf, { mergePages: false });
      pageBreakAnchors = text.slice(0, pageCount - 1).map(pageEndAnchor).filter(Boolean);
    }

    return NextResponse.json({ pageCount, pageBreakAnchors });
  } catch {
    return NextResponse.json({ error: "Couldn't count pages." }, { status: 500 });
  }
}
