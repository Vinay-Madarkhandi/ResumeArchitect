import Link from "next/link";
import { findToken } from "@/lib/auth/tokens";
import { AuthHeading } from "@/components/auth/AuthHeading";
import { VerifyEmailForm } from "@/components/auth/VerifyEmailForm";

export const metadata = { title: "Verify your email", referrer: "no-referrer" } as const;

export default async function VerifyEmailPage({ searchParams }: PageProps<"/verify-email">) {
  const { token, change } = await searchParams;
  const changing = change === "1";
  if (typeof token !== "string" || !await findToken(token, changing ? "change_email" : "verify_email")) {
    return (
      <>
        <AuthHeading title="This link isn't valid">
          Verification links expire. Sign in, or sign up again to get a fresh link.
        </AuthHeading>
        <Link href="/sign-in" className="text-small text-brass hover:underline">Back to sign in</Link>
      </>
    );
  }
  return <VerifyEmailForm token={token} changing={changing} />;
}
