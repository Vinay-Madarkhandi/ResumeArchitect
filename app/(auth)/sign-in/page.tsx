import { redirect } from "next/navigation";
import { SignInView } from "@/components/auth/SignInForm";
import { currentUser } from "@/lib/auth/current-user";

export default async function SignInPage() {
  if (await currentUser()) redirect("/dashboard");
  return <SignInView />;
}
