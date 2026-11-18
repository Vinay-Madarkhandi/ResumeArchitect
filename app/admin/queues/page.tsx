import { ActionForm } from "@/components/admin/ActionForm";
import { DataTable, EmptyRow, PageTitle, QueueSummary, dateTime } from "@/components/admin/parts";
import { requireAdmin } from "@/lib/admin/authorization";
import { failedJobs, queueHealth, queueNames } from "@/lib/admin/queues";
import { updateJob } from "../actions";

export default async function QueuesPage() {
  await requireAdmin();
  const data = await Promise.all(queueNames.map(async (name) => {
    const [health, jobs] = await Promise.all([queueHealth(name), failedJobs(name)]);
    return { name, health, jobs };
  }));

  return (
    <>
      <PageTitle title="Queues">Worker status, job counts, and the latest 25 failures per queue.</PageTitle>
      <div className="grid gap-6">
        {data.map(({ name, health, jobs }) => (
          <section key={name} aria-label={`${name} queue`} className="space-y-3">
            <QueueSummary queue={health} />
            <DataTable title={`${name} failed jobs`} headers={["Job", "Failed at (UTC)", "Reason", "Actions"]}>
              {(!jobs || jobs.length === 0) && <EmptyRow columns={4}>{jobs ? "No failed jobs." : "Failed jobs unavailable."}</EmptyRow>}
              {jobs?.map((job) => (
                <tr key={job.id}>
                  <td><div className="font-medium">{job.name}</div><div className="max-w-56 wrap-anywhere text-small text-ink-3">{job.id}</div></td>
                  <td className="whitespace-nowrap">{dateTime(job.finishedOn)}</td>
                  <td className="max-w-md whitespace-pre-wrap wrap-anywhere">{job.reason}</td>
                  <td><div className="flex gap-2">
                    <ActionForm action={updateJob} fields={{ queue: name, id: job.id, command: "retry" }} label="Retry" />
                    <ActionForm action={updateJob} fields={{ queue: name, id: job.id, command: "remove" }} label="Remove"
                      variant="danger" confirmation="Permanently remove this failed job from the queue." />
                  </div></td>
                </tr>
              ))}
            </DataTable>
          </section>
        ))}
      </div>
    </>
  );
}
