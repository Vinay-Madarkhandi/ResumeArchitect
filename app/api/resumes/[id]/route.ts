import { updateResume } from "@/lib/data/resumes";
import { checkOrigin } from "@/lib/auth/guards";
import { currentUser } from "@/lib/auth/current-user";
import { NextResponse } from "next/server";
import { z } from "zod";
import { DocumentContentSchema } from "@/lib/schemas/document";

const PatchSchema = z
  .object({
    content: DocumentContentSchema.optional(),
    title: z.string().trim().min(1).max(160).optional(),
    template: z.enum(["classic", "modern", "standard"]).optional(),
    reviewedChangeIds: z.array(z.string().max(32)).max(500).optional(),
    applicationStatus: z.enum(["saved", "applied", "interviewing", "offer", "rejected"]).optional(),
    coverLetter: z.string().max(20_000).optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), "Nothing to update.");

/** Saves editor state: content (autosave), title, template, kept-change ids, tracker status, cover letter. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const originError = checkOrigin(request);
  if (originError) return originError;
  const { id } = await params;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = PatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "That update wasn't valid." }, { status: 400 });
  const { content, title, template, reviewedChangeIds, applicationStatus, coverLetter } = parsed.data;

  const data = await updateResume(user.id, id, {
      ...(content ? { content } : {}),
      ...(title ? { title } : {}),
      ...(template ? { template } : {}),
      ...(reviewedChangeIds ? { reviewed_change_ids: reviewedChangeIds } : {}),
      ...(applicationStatus
        ? { application_status: applicationStatus, application_status_updated_at: new Date().toISOString() }
        : {}),
      ...(coverLetter !== undefined ? { cover_letter: coverLetter } : {}),
    }).catch(() => null);

  if (!data) return NextResponse.json({ error: "Couldn't save. Check your connection and try again." }, { status: 500 });
  return NextResponse.json({ updatedAt: data.updated_at });
}
