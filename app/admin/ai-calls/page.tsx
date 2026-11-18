import { DataTable, EmptyRow, PageTitle, dateTime } from "@/components/admin/parts";
import { Badge } from "@/components/ui/Badge";
import { requireAdmin } from "@/lib/admin/authorization";
import { recentAiFailures } from "@/lib/admin/queries";

export default async function AiCallsPage() {
  await requireAdmin();
  const failures = await recentAiFailures();
  return (
    <>
      <PageTitle title="AI calls">Latest 50 failed AI calls.</PageTitle>
      <DataTable title="Recent AI failures" headers={["Time (UTC)", "Operation", "Error code", "Model", "Latency"]}>
        {failures.length === 0 && <EmptyRow columns={5}>No failed AI calls.</EmptyRow>}
        {failures.map((failure) => (
          <tr key={failure.id}>
            <td className="whitespace-nowrap">{dateTime(failure.at)}</td>
            <td>{failure.kind}</td><td><Badge tone="del">{failure.error ?? "Unknown"}</Badge></td>
            <td>{failure.model}</td><td className="whitespace-nowrap font-mono">{failure.latency} ms</td>
          </tr>
        ))}
      </DataTable>
    </>
  );
}
