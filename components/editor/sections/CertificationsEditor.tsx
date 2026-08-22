import type { Certification } from "@/lib/schemas/resume";
import { Input, Label } from "@/components/ui/Input";
import { ListEditor } from "@/components/editor/ListEditor";

export function CertificationsEditor({
  value,
  onChange,
}: {
  value: Certification[];
  onChange: (next: Certification[]) => void;
}) {
  return (
    <ListEditor<Certification>
      items={value}
      onChange={onChange}
      addLabel="Add certification"
      emptyLabel="No certifications added yet."
      newItem={() => ({ id: crypto.randomUUID(), name: "" })}
      renderItem={(cert, update) => (
        <div className="grid grid-cols-1 gap-sm pr-lg sm:grid-cols-2">
          <div>
            <Label>Name</Label>
            <Input value={cert.name} onChange={(e) => update({ name: e.target.value })} />
          </div>
          <div>
            <Label>Issuer</Label>
            <Input value={cert.issuer ?? ""} onChange={(e) => update({ issuer: e.target.value })} />
          </div>
          <div>
            <Label>Date</Label>
            <Input value={cert.date ?? ""} onChange={(e) => update({ date: e.target.value })} />
          </div>
          <div>
            <Label>Link</Label>
            <Input value={cert.url ?? ""} onChange={(e) => update({ url: e.target.value })} />
          </div>
        </div>
      )}
    />
  );
}
