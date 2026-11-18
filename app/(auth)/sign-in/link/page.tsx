import Link from "next/link";
import { findToken } from "@/lib/auth/tokens";
import { AuthHeading } from "@/components/auth/AuthHeading";
import { SignInLinkForm } from "@/components/auth/SignInLinkForm";

export const metadata = { title: "Sign in", referrer: "no-referrer" } as const;

export default async function SignInLinkPage({ searchParams }: PageProps<"/sign-in/link">) {
  const { token } = await searchParams;
  if (typeof token !== "string" || !await findToken(token, "sign_in")) {
    return (
      <>
        <AuthHeading title="This link isn't valid">
          Sign-in links work once, for 15 minutes. Request a new one from the sign-in page.
        </AuthHeading>
        <Link href="/sign-in" className="text-small text-brass hover:underline">Back to sign in</Link>
      </>
    );
  }
  return <SignInLinkForm token={token} />;
}
