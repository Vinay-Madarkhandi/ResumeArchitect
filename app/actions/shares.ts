"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { currentUser, requestDetails, sessionOptions } from "@/lib/auth/current-user";
import { hashPassword, passwordError, verifyPassword } from "@/lib/auth/password";
import { rateLimit } from "@/lib/cache/rateLimit";
import { getOwnedShare, getShareAccess, publishOwnedShare, unpublishOwnedShare } from "@/lib/data/shares";
import { TEMPLATE_IDS } from "@/lib/resume/templates";
import { DocumentContentSchema } from "@/lib/schemas/document";
import { isShareSlug, shareCookieName, shareGrant } from "@/lib/sharing/access";
import { sharedDocument } from "@/lib/sharing/document";

const publishInput = z.object({
  content: DocumentContentSchema,
  template: z.enum(TEMPLATE_IDS),
  hideContact: z.boolean(),
  password: z.string().max(1024),
});

export async function loadResumeShare(resumeId: string) {
  const user = await currentUser();
  if (!user) return { error: "Sign in to manage this link." };
  try {
    return { share: await getOwnedShare(user.id, resumeId) ?? null };
  } catch {
    return { error: "Couldn't load the sharing settings. Try again." };
  }
}

export async function publishResumeShare(resumeId: string, input: unknown) {
  const user = await currentUser();
  if (!user) return { error: "Sign in to publish this resume." };
  const parsed = publishInput.safeParse(input);
  if (!parsed.success) return { error: "This resume couldn't be published. Check the sharing settings." };
  const { content, template, hideContact, password } = parsed.data;
  const error = password ? passwordError(password) : null;
  if (error) return { error };

  try {
    const share = await publishOwnedShare(user.id, resumeId, {
      content: sharedDocument(content, hideContact),
      template,
      password_hash: password ? await hashPassword(password) : null,
    });
    return share ? { share } : { error: "Resume not found." };
  } catch {
    return { error: "Couldn't publish the resume. Try again." };
  }
}

export async function unpublishResumeShare(resumeId: string) {
  const user = await currentUser();
  if (!user) return { error: "Sign in to unpublish this resume." };
  try {
    await unpublishOwnedShare(user.id, resumeId);
    return { ok: true };
  } catch {
    return { error: "Couldn't unpublish the resume. Try again." };
  }
}

export async function unlockResumeShare(slug: string, _state: string, formData: FormData): Promise<string> {
  const password = formData.get("password");
  if (!isShareSlug(slug) || typeof password !== "string" || password.length > 1024) {
    return "Enter the password for this resume.";
  }

  const share = await getShareAccess(slug);
  if (!share?.passwordHash) return "This password-protected link is no longer available.";
  const { ip } = await requestDetails();
  if (await rateLimit("share-password", JSON.stringify([slug, ip]), 8, 15 * 60_000)) {
    return "Too many attempts. Try again later.";
  }

  if (!(await verifyPassword(password, share.passwordHash))) return "Incorrect password.";
  (await cookies()).set(shareCookieName(slug), shareGrant(slug, share.passwordHash), {
    ...sessionOptions, path: `/r/${slug}`,
  });
  redirect(`/r/${slug}`);
}
