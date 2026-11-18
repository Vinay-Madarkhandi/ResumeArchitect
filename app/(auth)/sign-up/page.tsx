import { redirect } from "next/navigation";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { currentUser } from "@/lib/auth/current-user";

export default async function SignUpPage() {
  if (await currentUser()) redirect("/dashboard");
  return <SignUpForm />;
}
