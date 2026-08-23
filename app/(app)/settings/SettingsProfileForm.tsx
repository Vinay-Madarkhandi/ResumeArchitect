"use client";

import { useState, type FormEvent } from "react";
import { updateProfile } from "@/app/actions/profile";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldError } from "@/components/ui/Input";
import { Icon } from "@/components/icon/Icon";
import type { Link } from "@/lib/schemas/resume";

export function SettingsProfileForm({
  email,
  initialFullName,
  initialHeadline,
  initialPhone,
  initialLocation,
  initialLinks,
}: {
  email: string;
  initialFullName: string;
  initialHeadline: string;
  initialPhone: string;
  initialLocation: string;
  initialLinks: Link[];
}) {
  const [fullName, setFullName] = useState(initialFullName);
  const [headline, setHeadline] = useState(initialHeadline);
  const [phone, setPhone] = useState(initialPhone);
  const [location, setLocation] = useState(initialLocation);
  const [links, setLinks] = useState<Link[]>(initialLinks);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function addLink() {
    setLinks((prev) => [...prev, { label: "LinkedIn", url: "" }]);
  }
  function updateLink(index: number, patch: Partial<Link>) {
    setLinks((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }
  function removeLink(index: number) {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (!fullName.trim()) {
      setError("Please enter your name.");
      return;
    }
    setIsSubmitting(true);
    const result = await updateProfile({
      fullName: fullName.trim(),
      headline: headline.trim() || undefined,
      phone: phone.trim() || undefined,
      location: location.trim() || undefined,
      links: links.filter((l) => l.url.trim()),
    });
    setIsSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-md" noValidate>
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
        <div>
          <Label htmlFor="fullName">Name</Label>
          <Input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="headline">Professional title</Label>
          <Input id="headline" value={headline} onChange={(e) => setHeadline(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={email} disabled />
        </div>
        <div>
          <Label htmlFor="location">Location</Label>
          <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>

      <div>
        <Label>Links</Label>
        <div className="space-y-2">
          {links.map((link, index) => (
            <div key={index} className="flex gap-2">
              <Input value={link.label} onChange={(e) => updateLink(index, { label: e.target.value })} className="w-32" />
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

      <FieldError>{error ?? undefined}</FieldError>

      <div className="flex items-center gap-3 pt-md">
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save changes"}
        </Button>
        {saved && <span className="font-sans text-xs text-secondary">Saved.</span>}
      </div>
    </form>
  );
}
