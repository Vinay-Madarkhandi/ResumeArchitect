import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { DocumentView, Paper } from "@/components/paper/Paper";
import { getShareAccess, readSharedResume } from "@/lib/data/shares";
import { requestDetails } from "@/lib/auth/current-user";
import { shareCookieName, validShareGrant } from "@/lib/sharing/access";
import { SharePassword } from "./SharePassword";

export const metadata: Metadata = {
  title: "Shared resume",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function SharedResumePage({ params }: PageProps<"/r/[slug]">) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const access = await getShareAccess(slug);
  if (!access) notFound();
  if (access.passwordHash && !validShareGrant(cookieStore.get(shareCookieName(slug))?.value, slug, access.passwordHash)) {
    return <SharePassword slug={slug} />;
  }

  const share = await readSharedResume(slug, access.passwordHash, await requestDetails());
  if (!share) notFound();

  return (
    <main aria-label="Shared resume" className="px-3 py-8 sm:px-6">
      <Paper template={share.template}><DocumentView doc={share.content} /></Paper>
    </main>
  );
}
