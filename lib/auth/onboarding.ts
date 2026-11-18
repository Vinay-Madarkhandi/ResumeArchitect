import { redirect } from "next/navigation";
import { getProfileStatus } from "@/lib/data/profiles";
import { requireUser } from "./current-user";

export async function requireOnboardedUser() {
  const user = await requireUser();
  if (!(await getProfileStatus(user.id))?.onboarding_completed_at) redirect("/onboarding");
  return user;
}
