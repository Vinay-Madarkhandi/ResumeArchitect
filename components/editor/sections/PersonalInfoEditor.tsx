import type { Link, PersonalInfo } from "@/lib/schemas/resume";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/icon/Icon";
import { isLowConfidence, lowConfidenceClass } from "@/lib/editor/lowConfidence";
import { cn } from "@/lib/cn";

export function PersonalInfoEditor({
  value,
  onChange,
  lowConfidenceFields,
}: {
  value: PersonalInfo;
  onChange: (next: PersonalInfo) => void;
  lowConfidenceFields?: string[];
}) {
  function set<K extends keyof PersonalInfo>(key: K, val: PersonalInfo[K]) {
    onChange({ ...value, [key]: val });
  }

  function updateLink(index: number, patch: Partial<Link>) {
    const next = value.links.map((l, i) => (i === index ? { ...l, ...patch } : l));
    onChange({ ...value, links: next });
  }
  function removeLink(index: number) {
    onChange({ ...value, links: value.links.filter((_, i) => i !== index) });
  }
  function addLink() {
    onChange({ ...value, links: [...value.links, { label: "Website", url: "" }] });
  }

  return (
    <div className="space-y-md">
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
        <div>
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            value={value.fullName}
            onChange={(e) => set("fullName", e.target.value)}
            className={cn(lowConfidenceClass(lowConfidenceFields, "personalInfo.fullName"))}
          />
        </div>
        <div>
          <Label htmlFor="headline">Professional title</Label>
          <Input
            id="headline"
            value={value.headline ?? ""}
            onChange={(e) => set("headline", e.target.value)}
            className={cn(lowConfidenceClass(lowConfidenceFields, "personalInfo.headline"))}
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={value.email ?? ""}
            onChange={(e) => set("email", e.target.value)}
            className={cn(lowConfidenceClass(lowConfidenceFields, "personalInfo.email"))}
          />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={value.phone ?? ""}
            onChange={(e) => set("phone", e.target.value)}
            className={cn(lowConfidenceClass(lowConfidenceFields, "personalInfo.phone"))}
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={value.location ?? ""}
            onChange={(e) => set("location", e.target.value)}
            placeholder="City, State"
            className={cn(lowConfidenceClass(lowConfidenceFields, "personalInfo.location"))}
          />
        </div>
      </div>

      <div>
        <Label>
          Links{" "}
          {isLowConfidence(lowConfidenceFields, "personalInfo.links") && (
            <span className="font-sans text-xs font-normal normal-case tracking-normal text-secondary">
              — double-check these
            </span>
          )}
        </Label>
        <div className="space-y-2">
          {value.links.map((link, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={link.label}
                onChange={(e) => updateLink(index, { label: e.target.value })}
                placeholder="Label"
                className="w-32"
              />
              <Input
                value={link.url}
                onChange={(e) => updateLink(index, { url: e.target.value })}
                placeholder="https://…"
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => removeLink(index)}
                className="px-2 text-on-surface-variant hover:text-error"
                aria-label="Remove link"
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          ))}
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={addLink} className="mt-2">
          <Icon name="plus" size={14} />
          Add link
        </Button>
      </div>
    </div>
  );
}
