export function isAdmin<T extends { role: string }>(user: T | null): user is T {
  return user?.role === "admin";
}

export function accountActionError(
  action: string,
  actorId: string,
  target: { id: string; role: string; banned_at: string | null; email_verified_at: string | null },
  otherActiveAdmins: number,
) {
  if (actorId === target.id && ["ban", "delete", "demote"].includes(action)) {
    return "You cannot ban, delete, or demote your own account here.";
  }
  if (["ban", "delete", "demote"].includes(action) && target.role === "admin" &&
      !target.banned_at && target.email_verified_at && otherActiveAdmins === 0) {
    return "Keep at least one active, verified administrator.";
  }
  if (action === "promote" && (!target.email_verified_at || target.banned_at)) {
    return "Only active, verified accounts can be promoted.";
  }
}
