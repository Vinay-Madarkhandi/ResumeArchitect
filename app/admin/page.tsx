import Link from "next/link";
import { DataTable, EmptyRow, PageTitle, Panel, QueueSummary, Stat } from "@/components/admin/parts";
import { buttonVariants } from "@/components/ui/Button";
import { requireAdmin } from "@/lib/admin/authorization";
import { percentage } from "@/lib/admin/metrics";
import { overview } from "@/lib/admin/queries";
import { queueHealth, queueNames } from "@/lib/admin/queues";

function ActivityChart({ label, points }: { label: string; points: { day: string; count: number }[] }) {
  const peak = Math.max(1, ...points.map(({ count }) => count));
  const total = points.reduce((sum, { count }) => sum + count, 0);
  return (
    <Panel title={label}>
      <p className="mb-3 text-small text-ink-2"><span className="font-mono">{total}</span> in 30 days</p>
      <figure aria-label={`${label} per day, UTC`}>
        <div className="grid h-24 grid-cols-[repeat(30,minmax(0,1fr))] items-end gap-0.5 border-b border-line-strong" aria-hidden="true">
          {points.map(({ day, count }) => (
            <span key={day} title={`${day}: ${count}`} className="block rounded-t-sm bg-ink-2"
              style={{ height: count ? `${100 * count / peak}%` : "1px", opacity: count ? 1 : 0.2 }} />
          ))}
        </div>
        <div className="mt-1 flex justify-between text-label text-ink-3" aria-hidden="true">
          <span>{points[0].day}</span><span>{points.at(-1)?.day}</span>
        </div>
        <details className="mt-2 text-small text-ink-2">
          <summary className="cursor-pointer">Daily counts</summary>
          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
            {points.map(({ day, count }) => (
              <div key={day} className="flex justify-between gap-2"><dt>{day}</dt><dd className="font-mono">{count}</dd></div>
            ))}
          </dl>
        </details>
      </figure>
    </Panel>
  );
}

export default async function AdminOverview() {
  await requireAdmin();
  const [metrics, queues] = await Promise.all([overview(), Promise.all(queueNames.map(queueHealth))]);
  const calls = metrics.calls.reduce((sum, day) => sum + day.count, 0);
  const failures = metrics.failures.reduce((sum, row) => sum + row.count, 0);

  return (
    <>
      <PageTitle title="Overview">Platform activity over the last 30 days, including today. Dates and times are UTC.</PageTitle>
      <dl className="mb-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Total users" value={metrics.users.total} />
        <Stat label="Verified share" value={percentage(metrics.users.verified, metrics.users.total)}
          detail={`${metrics.users.verified} verified users`} />
        <Stat label="AI error rate" value={percentage(failures, calls)} detail={`${failures} failures of ${calls} calls`} />
      </dl>
      <section aria-label="Daily activity" className="mb-6 grid gap-3 sm:grid-cols-2">
        <ActivityChart label="New users" points={metrics.signups} />
        <ActivityChart label="Scans" points={metrics.scans} />
        <ActivityChart label="Tailorings" points={metrics.tailorings} />
        <ActivityChart label="AI calls" points={metrics.calls} />
      </section>
      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-title font-semibold">AI errors by code</h2>
          <Link href="/admin/ai-calls" className={buttonVariants({ size: "sm" })}>Recent failures</Link>
        </div>
        <DataTable title="AI errors by code" headers={["Code", "Failures", "Share of all calls"]}>
          {metrics.failures.length === 0 && <EmptyRow columns={3}>No AI failures in this period.</EmptyRow>}
          {metrics.failures.map(({ code, count }) => (
            <tr key={code ?? ""}><td>{code ?? "Unknown"}</td><td className="font-mono">{count}</td>
              <td className="font-mono">{percentage(count, calls)}</td></tr>
          ))}
        </DataTable>
      </section>
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-title font-semibold">Queue health</h2>
          <Link href="/admin/queues" className={buttonVariants({ size: "sm" })}>Manage queues</Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2">{queues.map((queue) => <QueueSummary key={queue.name} queue={queue} />)}</div>
      </section>
    </>
  );
}
