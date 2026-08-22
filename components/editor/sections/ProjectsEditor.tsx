import type { ProjectEntry } from "@/lib/schemas/resume";
import { Input, Label } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { ListEditor, BulletListEditor } from "@/components/editor/ListEditor";

export function ProjectsEditor({
  value,
  onChange,
}: {
  value: ProjectEntry[];
  onChange: (next: ProjectEntry[]) => void;
}) {
  return (
    <ListEditor<ProjectEntry>
      items={value}
      onChange={onChange}
      addLabel="Add project"
      emptyLabel="No projects yet."
      newItem={() => ({ id: crypto.randomUUID(), name: "", technologies: [], bullets: [] })}
      renderItem={(entry, update) => (
        <div className="space-y-sm pr-lg">
          <div className="grid grid-cols-1 gap-sm sm:grid-cols-2">
            <div>
              <Label>Name</Label>
              <Input value={entry.name} onChange={(e) => update({ name: e.target.value })} />
            </div>
            <div>
              <Label>Link</Label>
              <Input value={entry.url ?? ""} onChange={(e) => update({ url: e.target.value })} placeholder="https://…" />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              rows={2}
              value={entry.description ?? ""}
              onChange={(e) => update({ description: e.target.value })}
            />
          </div>
          <div>
            <Label>Technologies (comma-separated)</Label>
            <Input
              value={entry.technologies?.join(", ") ?? ""}
              onChange={(e) =>
                update({ technologies: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })
              }
            />
          </div>
          <div>
            <Label>Bullets</Label>
            <BulletListEditor bullets={entry.bullets} onChange={(bullets) => update({ bullets })} />
          </div>
        </div>
      )}
    />
  );
}
