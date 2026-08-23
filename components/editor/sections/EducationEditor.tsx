import type { EducationEntry } from "@/lib/schemas/resume";
import { Input, Label } from "@/components/ui/Input";
import { ListEditor } from "@/components/editor/ListEditor";
import { lowConfidenceClass } from "@/lib/editor/lowConfidence";
import { cn } from "@/lib/cn";

export function EducationEditor({
  value,
  onChange,
  lowConfidenceFields,
}: {
  value: EducationEntry[];
  onChange: (next: EducationEntry[]) => void;
  lowConfidenceFields?: string[];
}) {
  return (
    <ListEditor<EducationEntry>
      items={value}
      onChange={onChange}
      addLabel="Add education"
      emptyLabel="No education added yet."
      newItem={() => ({ id: crypto.randomUUID(), institution: "", honors: [] })}
      renderItem={(entry, update, index) => (
        <div className="grid grid-cols-1 gap-sm pr-lg sm:grid-cols-2">
          <div>
            <Label>Institution</Label>
            <Input
              value={entry.institution}
              onChange={(e) => update({ institution: e.target.value })}
              className={cn(lowConfidenceClass(lowConfidenceFields, `education[${index}].institution`))}
            />
          </div>
          <div>
            <Label>Degree</Label>
            <Input
              value={entry.degree ?? ""}
              onChange={(e) => update({ degree: e.target.value })}
              className={cn(lowConfidenceClass(lowConfidenceFields, `education[${index}].degree`))}
            />
          </div>
          <div className="grid grid-cols-2 gap-sm">
            <div>
              <Label>Start</Label>
              <Input value={entry.startDate ?? ""} onChange={(e) => update({ startDate: e.target.value })} />
            </div>
            <div>
              <Label>End</Label>
              <Input value={entry.endDate ?? ""} onChange={(e) => update({ endDate: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>GPA</Label>
            <Input value={entry.gpa ?? ""} onChange={(e) => update({ gpa: e.target.value })} />
          </div>
        </div>
      )}
    />
  );
}
