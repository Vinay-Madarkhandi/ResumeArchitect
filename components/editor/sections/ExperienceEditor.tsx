import type { ExperienceEntry } from "@/lib/schemas/resume";
import { Input, Label } from "@/components/ui/Input";
import { ListEditor, BulletListEditor } from "@/components/editor/ListEditor";
import { lowConfidenceClass } from "@/lib/editor/lowConfidence";
import { cn } from "@/lib/cn";

export function ExperienceEditor({
  value,
  onChange,
  lowConfidenceFields,
}: {
  value: ExperienceEntry[];
  onChange: (next: ExperienceEntry[]) => void;
  lowConfidenceFields?: string[];
}) {
  return (
    <ListEditor<ExperienceEntry>
      items={value}
      onChange={onChange}
      addLabel="Add experience"
      emptyLabel="No work experience yet."
      newItem={() => ({
        id: crypto.randomUUID(),
        company: "",
        role: "",
        isCurrent: false,
        endDate: null,
        bullets: [],
      })}
      renderItem={(entry, update, index) => (
        <div className="space-y-sm pr-lg">
          <div className="grid grid-cols-1 gap-sm sm:grid-cols-2">
            <div>
              <Label>Role</Label>
              <Input
                value={entry.role}
                onChange={(e) => update({ role: e.target.value })}
                className={cn(lowConfidenceClass(lowConfidenceFields, `experience[${index}].role`))}
              />
            </div>
            <div>
              <Label>Company</Label>
              <Input
                value={entry.company}
                onChange={(e) => update({ company: e.target.value })}
                className={cn(lowConfidenceClass(lowConfidenceFields, `experience[${index}].company`))}
              />
            </div>
            <div>
              <Label>Location</Label>
              <Input value={entry.location ?? ""} onChange={(e) => update({ location: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-sm">
              <div>
                <Label>Start</Label>
                <Input
                  value={entry.startDate ?? ""}
                  onChange={(e) => update({ startDate: e.target.value })}
                  placeholder="Jan 2020"
                  className={cn(lowConfidenceClass(lowConfidenceFields, `experience[${index}].startDate`))}
                />
              </div>
              <div>
                <Label>End</Label>
                <Input
                  value={entry.isCurrent ? "Present" : (entry.endDate ?? "")}
                  disabled={entry.isCurrent}
                  onChange={(e) => update({ endDate: e.target.value })}
                  placeholder="Jun 2022"
                />
              </div>
            </div>
          </div>
          <label className="flex items-center gap-2 font-sans text-xs text-on-surface-variant">
            <input
              type="checkbox"
              checked={entry.isCurrent}
              onChange={(e) => update({ isCurrent: e.target.checked, endDate: e.target.checked ? null : entry.endDate })}
            />
            I currently work here
          </label>
          <div>
            <Label>Bullets</Label>
            <BulletListEditor bullets={entry.bullets} onChange={(bullets) => update({ bullets })} />
          </div>
        </div>
      )}
    />
  );
}
