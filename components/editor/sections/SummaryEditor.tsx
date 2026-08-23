import { Textarea } from "@/components/ui/Textarea";

export function SummaryEditor({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (next: string | null) => void;
}) {
  return (
    <Textarea
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      rows={4}
      placeholder="A 2-3 sentence overview of your experience and what you're looking for."
    />
  );
}
