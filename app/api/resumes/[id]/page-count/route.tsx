import { readJson } from "@/lib/server/request-body";
import { checkOrigin } from "@/lib/auth/guards";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { extractText, getDocumentProxy } from "unpdf";
import { requireOwnedResume } from "@/lib/server/ownedResume";
import { DocumentContentSchema } from "@/lib/schemas/document";
import { DocumentPdf } from "@/lib/pdf/docToPdfTree";
import { getTemplate } from "@/lib/resume/templates";

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
 * Printed page count for the editor, from the real PDF renderer (the browser
 * lays text out differently, so it can't measure this itself). Also returns
 * the last words of every page but the last, which the editor uses to draw
 * approximate page-break markers (lib/editor/extensions.ts). Renders the live,
 * possibly unsaved content posted by the client.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const originError = checkOrigin(request);
  if (originError) return originError;
  const { id } = await params;
  const owned = await requireOwnedResume(id);
  if (!owned.ok) return owned.response;

  const json = await readJson<Record<string, unknown>>(request);
  if (!json.ok) return json.response;
  const body = json.data;
  const parsed = DocumentContentSchema.safeParse(body?.content);
  if (!parsed.success) return NextResponse.json({ error: "Invalid content." }, { status: 400 });

  try {
    const buffer = await renderToBuffer(<DocumentPdf doc={parsed.data} template={getTemplate(typeof body?.template === "string" ? body.template : undefined)} />);
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
