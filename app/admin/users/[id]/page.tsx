import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ActionForm } from "@/components/admin/ActionForm";
import { DataTable, EmptyRow, PageTitle, Panel, Stat, dateTime } from "@/components/admin/parts";
import { Badge } from "@/components/ui/Badge";
import { Field, Textarea } from "@/components/ui/Field";
import { requireAdmin } from "@/lib/admin/authorization";
import { getUserDetails } from "@/lib/admin/queries";
import { updateUser } from "../../actions";

export default async function UserPage({ params }: PageProps<"/admin/users/[id]">) {
  const actor = await requireAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const details = await getUserDetails(id);
  if (!details) notFound();
  const { user, activeSessions, sessionCount, resumeCount, usage } = details;
  const self = actor.id === user.id;
  const banCommand = user.banned_at ? "unban" : "ban";
  const roleCommand = user.role === "admin" ? "demote" : "promote";

  return (
    <>
      <Link href="/admin/users" className="mb-4 inline-block text-small text-ink-2 underline underline-offset-4 hover:text-ink">Back to users</Link>
      <div className="wrap-anywhere">
        <PageTitle title={user.email}>Joined {dateTime(user.created_at)} UTC</PageTitle>
      </div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Badge>{user.role === "admin" ? "Admin" : "User"}</Badge>
        {self && <Badge>Your account</Badge>}
        <Badge tone={user.email_verified_at ? "add" : "query"}>{user.email_verified_at ? "Verified" : "Unverified"}</Badge>
        <Badge tone={user.banned_at ? "del" : "neutral"}>{user.banned_at ? "Suspended" : "Active"}</Badge>
      </div>
      <p className="mb-5 text-body text-ink-2">Last sign-in {user.last_sign_in_at ? `${dateTime(user.last_sign_in_at)} UTC` : "—"}</p>
      {user.banned_at && <p className="mb-5 whitespace-pre-wrap wrap-anywhere text-body">Suspension reason: {user.ban_reason ?? "—"}</p>}
      <dl className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Resumes" value={resumeCount} />
        <Stat label="Active sessions" value={sessionCount} />
        <Stat label="AI calls" value={usage.calls} detail={`${usage.failures} failures`} />
        <Stat label="AI tokens" value={usage.input + usage.output} detail={`${usage.input} in · ${usage.output} out`} />
      </dl>
      <Panel title="Account actions" className="mb-6">
        <div className="flex flex-wrap gap-2">
          {!user.email_verified_at && (
            <>
              {!user.banned_at && <ActionForm action={updateUser} fields={{ id, command: "resend" }} label="Resend verification" />}
              <ActionForm action={updateUser} fields={{ id, command: "verify" }} label="Mark verified"
                confirmation="Confirm that this account owns the email address before verifying it." />
            </>
          )}
          <ActionForm action={updateUser} fields={{ id, command: "revoke" }} label="Revoke all sessions"
            confirmation="This signs the user out on every device." />
          {(user.role === "admin" || (user.email_verified_at && !user.banned_at)) && (
            <ActionForm key={roleCommand} action={updateUser} fields={{ id, command: roleCommand }}
              label={roleCommand === "promote" ? "Promote to admin" : "Demote to user"}
              confirmation={roleCommand === "promote" ? "This account will gain full access to the admin panel." : "This account will lose access to the admin panel."} />
          )}
          {!self && (
            <>
              <ActionForm key={banCommand} action={updateUser} fields={{ id, command: banCommand }}
                label={banCommand === "ban" ? "Ban user" : "Unban user"} variant={banCommand === "ban" ? "danger" : "secondary"}
                confirmation={banCommand === "ban" ? "This revokes every session and blocks future sign-ins." : "This restores the user's ability to sign in."}>
                <Field label="Reason">{(props) => <Textarea {...props} name="reason" required maxLength={500} />}</Field>
              </ActionForm>
              <ActionForm action={updateUser} fields={{ id, command: "delete" }} label="Delete account" variant="danger"
                confirmation="This permanently deletes the account, resumes, scans, and stored files." />
            </>
          )}
        </div>
      </Panel>
      <h2 className="mb-3 text-title font-semibold">Active sessions</h2>
      {sessionCount > activeSessions.length && <p className="mb-2 text-small text-ink-2">Showing the 25 latest sessions.</p>}
      <DataTable title="Active sessions" headers={["Created (UTC)", "Expires (UTC)", "Browser / device"]}>
        {activeSessions.length === 0 && <EmptyRow columns={3}>No active sessions.</EmptyRow>}
        {activeSessions.map((entry, index) => (
          <tr key={index}><td className="whitespace-nowrap">{dateTime(entry.createdAt)}</td>
            <td className="whitespace-nowrap">{dateTime(entry.expiresAt)}</td>
            <td className="max-w-xl wrap-anywhere text-small text-ink-2">{entry.agent ?? "Unknown"}</td></tr>
        ))}
      </DataTable>
    </>
  );
}
