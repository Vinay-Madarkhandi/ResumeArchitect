import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
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
  const { id } = await params;
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = PatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "That update wasn't valid." }, { status: 400 });
  const { content, title, template, reviewedChangeIds, applicationStatus, coverLetter } = parsed.data;

  const { data, error } = await supabase
    .from("resumes")
    .update({
      ...(content ? { content } : {}),
      ...(title ? { title } : {}),
      ...(template ? { template } : {}),
      ...(reviewedChangeIds ? { reviewed_change_ids: reviewedChangeIds } : {}),
      ...(applicationStatus
        ? { application_status: applicationStatus, application_status_updated_at: new Date().toISOString() }
        : {}),
      ...(coverLetter !== undefined ? { cover_letter: coverLetter } : {}),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("updated_at")
    .single();

  if (error || !data) return NextResponse.json({ error: "Couldn't save. Check your connection and try again." }, { status: 500 });
  return NextResponse.json({ updatedAt: data.updated_at });
}
