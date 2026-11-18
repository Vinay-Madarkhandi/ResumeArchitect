import { desc } from "drizzle-orm";
import { ActionForm } from "@/components/admin/ActionForm";
import { DataTable, EmptyRow, PageTitle, Panel, Pager, dateTime } from "@/components/admin/parts";
import { Badge } from "@/components/ui/Badge";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { announcementStatus } from "@/lib/admin/announcement-date";
import { requireAdmin } from "@/lib/admin/authorization";
import { PAGE_SIZE, pageNumber } from "@/lib/admin/queries";
import { announcementLevels } from "@/lib/data/announcements";
import { db } from "@/lib/db";
import { announcements } from "@/lib/db/schema";
import { createAnnouncement, endAnnouncement } from "../actions";

export default async function AnnouncementsPage({ searchParams }: PageProps<"/admin/announcements">) {
  await requireAdmin();
  const page = pageNumber(await searchParams);
  const rows = await db.select().from(announcements).orderBy(desc(announcements.starts_at), desc(announcements.id))
    .limit(PAGE_SIZE + 1).offset((page - 1) * PAGE_SIZE);
  const now = Date.now();

  return (
    <>
      <PageTitle title="Announcements">Signed-in users see the most recently started active announcement.</PageTitle>
      <Panel title="New announcement" className="mb-6">
        <ActionForm action={createAnnouncement} label="Save announcement" variant="primary">
          <Field label="Message">{(props) => <Textarea {...props} name="body" required maxLength={1000} />}</Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Level">{(props) => (
              <Select {...props} name="level">
                {announcementLevels.map((level) => <option key={level} value={level}>{level[0].toUpperCase() + level.slice(1)}</option>)}
              </Select>
            )}</Field>
            <Field label="Start (UTC)" optional hint="Leave blank to publish immediately.">{(props) => <Input {...props} name="starts" type="datetime-local" />}</Field>
            <Field label="End (UTC)" optional hint="Leave blank to end it manually.">{(props) => <Input {...props} name="ends" type="datetime-local" />}</Field>
          </div>
        </ActionForm>
      </Panel>
      <DataTable title="Announcements" headers={["Message", "Level", "Status", "Start (UTC)", "End (UTC)", "Actions"]}>
        {rows.length === 0 && <EmptyRow columns={6}>No announcements.</EmptyRow>}
        {rows.slice(0, PAGE_SIZE).map((row) => {
          const status = announcementStatus(row, now);
          return (
            <tr key={row.id}>
              <td className="min-w-48 max-w-lg whitespace-pre-wrap wrap-anywhere">{row.body}</td>
              <td className="capitalize">{row.level}</td>
              <td><Badge tone={status === "Active" ? "add" : status === "Scheduled" ? "query" : "neutral"}>{status}</Badge></td>
              <td className="whitespace-nowrap">{dateTime(row.starts_at)}</td>
              <td className="whitespace-nowrap">{dateTime(row.ends_at)}</td>
              <td>{status !== "Ended" && (
                <ActionForm action={endAnnouncement} fields={{ id: row.id }} label={status === "Scheduled" ? "Cancel schedule" : "End announcement"}
                  variant="danger" confirmation={status === "Scheduled" ? "Cancel this scheduled announcement." : "Remove this announcement from the signed-in banner."} />
              )}</td>
            </tr>
          );
        })}
      </DataTable>
      <Pager path="/admin/announcements" page={page} hasNext={rows.length > PAGE_SIZE} />
    </>
  );
}
