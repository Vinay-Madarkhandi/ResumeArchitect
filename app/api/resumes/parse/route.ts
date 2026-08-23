import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { parseResumeFile, ResumeParseError } from "@/lib/resume-parser";
import { mergeParsedContentWithProfile } from "@/lib/resume-parser/mergeProfile";
import { MAX_RESUME_UPLOAD_BYTES, RESUME_UPLOADS_BUCKET, originalResumePath } from "@/lib/storage/paths";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ errorCode: "unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  const previousResumeId = formData.get("previousResumeId");

  if (!(file instanceof File)) {
    return NextResponse.json({ errorCode: "no_file", errorMessage: "No file was uploaded." }, { status: 400 });
  }
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json(
      { errorCode: "invalid_file_type", errorMessage: "Please upload a PDF file." },
      { status: 400 },
    );
  }
  if (file.size > MAX_RESUME_UPLOAD_BYTES) {
    return NextResponse.json(
      { errorCode: "file_too_large", errorMessage: "That file is larger than 10MB. Please upload a smaller PDF." },
      { status: 400 },
    );
  }

  const resumeId = crypto.randomUUID();
  const arrayBuffer = await file.arrayBuffer();
  const storagePath = originalResumePath(user.id, resumeId);

  const { error: uploadError } = await supabase.storage
    .from(RESUME_UPLOADS_BUCKET)
    .upload(storagePath, arrayBuffer, { contentType: "application/pdf", upsert: false });

  if (uploadError) {
    return NextResponse.json(
      { errorCode: "upload_failed", errorMessage: "Couldn't save your file. Please try again." },
      { status: 500 },
    );
  }

  try {
    const { content, lowConfidenceFields } = await parseResumeFile(arrayBuffer);

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, headline, phone, location, links")
      .eq("id", user.id)
      .single();

    const mergedContent = mergeParsedContentWithProfile(content, {
      fullName: profile?.full_name,
      headline: profile?.headline,
      email: user.email,
      phone: profile?.phone,
      location: profile?.location,
      links: profile?.links,
    });

    const { error: insertError } = await supabase.from("resumes").insert({
      id: resumeId,
      user_id: user.id,
      kind: "master",
      title: "Master Resume",
      content: mergedContent,
      status: "draft",
      is_default: false,
      original_file_storage_path: storagePath,
      original_file_name: file.name,
      low_confidence_fields: lowConfidenceFields,
    });

    if (insertError) {
      await supabase.storage.from(RESUME_UPLOADS_BUCKET).remove([storagePath]);
      return NextResponse.json(
        { errorCode: "save_failed", errorMessage: "Couldn't save your resume. Please try again." },
        { status: 500 },
      );
    }

    // Clean up a previous pending (not-yet-finalized) upload from this same
    // onboarding attempt so replacing the file before finishing doesn't
    // leave an orphaned draft row behind.
    if (typeof previousResumeId === "string" && previousResumeId) {
      const { data: previous } = await supabase
        .from("resumes")
        .select("id, original_file_storage_path, is_default, user_id")
        .eq("id", previousResumeId)
        .maybeSingle();
      if (previous && previous.user_id === user.id && !previous.is_default) {
        if (previous.original_file_storage_path) {
          await supabase.storage.from(RESUME_UPLOADS_BUCKET).remove([previous.original_file_storage_path]);
        }
        await supabase.from("resumes").delete().eq("id", previous.id);
      }
    }

    return NextResponse.json({ resumeId, content: mergedContent, lowConfidenceFields });
  } catch (error) {
    await supabase.storage.from(RESUME_UPLOADS_BUCKET).remove([storagePath]);
    const message =
      error instanceof ResumeParseError
        ? error.message
        : "Something went wrong while reading your resume. Please try again.";
    return NextResponse.json({ errorCode: "parse_failed", errorMessage: message }, { status: 422 });
  }
}
