import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { ResumeContentSchema } from "@/lib/schemas/resume";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { data: resume } = await supabase
    .from("resumes")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!resume) return NextResponse.json({ error: "Resume not found." }, { status: 404 });
  return NextResponse.json(resume);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = ResumeContentSchema.safeParse(body?.content);
  if (!parsed.success) {
    return NextResponse.json({ error: "Resume content didn't match the expected shape." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("resumes")
    .update({ content: parsed.data })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("updated_at")
    .single();

  if (error || !data) return NextResponse.json({ error: "Couldn't save. Please try again." }, { status: 500 });
  return NextResponse.json({ updatedAt: data.updated_at });
}
