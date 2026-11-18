import { ActionForm } from "@/components/admin/ActionForm";
import { DataTable, PageTitle } from "@/components/admin/parts";
import { Badge } from "@/components/ui/Badge";
import { requireAdmin } from "@/lib/admin/authorization";
import { listFeatureFlags } from "@/lib/feature-flags";
import { toggleFlag } from "../actions";

export default async function FeatureFlagsPage() {
  await requireAdmin();
  const flags = await listFeatureFlags();
  return (
    <>
      <PageTitle title="Feature flags" />
      <DataTable title="Feature flags" headers={["Flag", "Description", "Status", "Actions"]}>
        {flags.map(({ key, note, enabled }) => (
          <tr key={key}>
            <td className="font-medium">{key}</td>
            <td>{note ?? "—"}</td>
            <td><Badge tone={enabled ? "add" : "neutral"}>{enabled ? "Enabled" : "Disabled"}</Badge></td>
            <td><ActionForm action={toggleFlag} fields={{ key, enabled: String(!enabled) }} label={enabled ? "Disable" : "Enable"} /></td>
          </tr>
        ))}
      </DataTable>
    </>
  );
}
