import { DataTable, EmptyRow, PageTitle, Pager, dateTime } from "@/components/admin/parts";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { requireAdmin } from "@/lib/admin/authorization";
import { filter, listAudit, pageNumber } from "@/lib/admin/queries";

export default async function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
  await requireAdmin();
  const params = await searchParams;
  const page = pageNumber(params);
  const action = filter(params, "action", 100);
  const actor = filter(params, "actor");
  const target = filter(params, "target");
  const { rows, actions, hasNext } = await listAudit(params, page);

  return (
    <>
      <PageTitle title="Audit log" />
      <form action="/admin/audit" className="mb-4 grid items-end gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <Field label="Action">{(props) => (
          <Select {...props} name="action" defaultValue={action}>
            <option value="">All actions</option>
            {actions.map((entry) => <option key={entry.action}>{entry.action}</option>)}
          </Select>
        )}</Field>
        <Field label="Actor email">{(props) => <Input {...props} name="actor" defaultValue={actor} maxLength={254} />}</Field>
        <Field label="Target ID or key">{(props) => <Input {...props} name="target" defaultValue={target} maxLength={254} />}</Field>
        <Button type="submit" variant="primary">Filter</Button>
      </form>
      <DataTable title="Audit log" headers={["Time (UTC)", "Actor", "Action", "Target", "Details"]}>
        {rows.length === 0 && <EmptyRow columns={5}>No matching audit entries.</EmptyRow>}
        {rows.map((row) => (
          <tr key={row.id}>
            <td className="whitespace-nowrap">{dateTime(row.at)}</td>
            <td>{row.email ?? row.actorId ?? "Deleted account"}{row.ip && <div className="text-small text-ink-3">{row.ip}</div>}</td>
            <td>{row.action}</td>
            <td className="max-w-56 wrap-anywhere">{row.target ?? "—"}</td>
            <td className="max-w-72 wrap-anywhere text-small text-ink-2">
              {row.meta && typeof row.meta === "object" && Object.entries(row.meta).map(([key, value]) => (
                <div key={key}>{key}: {typeof value === "object" ? JSON.stringify(value) : String(value)}</div>
              ))}
            </td>
          </tr>
        ))}
      </DataTable>
      <Pager path="/admin/audit" page={page} hasNext={hasNext} filters={{ action, actor, target }} />
    </>
  );
}
