import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/current-user";
import { getResume } from "@/lib/data/resumes";

export async function requireOwnedResume(id: string) {
  const user = await currentUser();
  if (!user) return { ok: false, response: NextResponse.json({ error: "Sign in to continue." }, { status: 401 }) } as const;
  const resume = await getResume(user.id, id);
  if (!resume) return { ok: false, response: NextResponse.json({ error: "Resume not found." }, { status: 404 }) } as const;
  return { ok: true, user, resume } as const;
}
