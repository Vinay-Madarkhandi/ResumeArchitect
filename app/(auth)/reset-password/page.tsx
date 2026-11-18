import Link from "next/link";
import { findToken } from "@/lib/auth/tokens";
import { AuthHeading } from "@/components/auth/AuthHeading";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata = { title: "Reset your password", referrer: "no-referrer" } as const;

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token } = await searchParams;
  if (typeof token !== "string" || !await findToken(token, "reset_password")) {
    return (
      <>
        <AuthHeading title="This link has expired">Reset links work once and expire after an hour. Request a new one.</AuthHeading>
        <Link href="/forgot-password" className="text-small text-brass hover:underline">Send a new link</Link>
      </>
    );
  }
  return <ResetPasswordForm token={token} />;
}
