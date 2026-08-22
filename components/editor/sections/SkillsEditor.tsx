import type { SkillGroup } from "@/lib/schemas/resume";
import { Input, Label } from "@/components/ui/Input";
import { ListEditor } from "@/components/editor/ListEditor";

export function SkillsEditor({
  value,
  onChange,
}: {
  value: SkillGroup[];
  onChange: (next: SkillGroup[]) => void;
}) {
  return (
    <ListEditor<SkillGroup>
      items={value}
      onChange={onChange}
      addLabel="Add skill group"
      emptyLabel="No skills added yet."
      newItem={() => ({ id: crypto.randomUUID(), category: "Skills", items: [] })}
      renderItem={(group, update) => (
        <div className="grid grid-cols-1 gap-sm pr-lg sm:grid-cols-[10rem_1fr]">
          <div>
            <Label>Category</Label>
            <Input value={group.category} onChange={(e) => update({ category: e.target.value })} />
          </div>
          <div>
            <Label>Skills (comma-separated)</Label>
            <Input
              value={group.items.join(", ")}
              onChange={(e) => update({ items: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
            />
          </div>
        </div>
      )}
    />
  );
}
