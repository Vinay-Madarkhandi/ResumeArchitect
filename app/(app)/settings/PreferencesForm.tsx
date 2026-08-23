"use client";

import { useState } from "react";
import { updatePreferences } from "@/app/actions/account";
import { Switch } from "@/components/ui/Switch";
import type { ProfilePreferences } from "@/lib/schemas/profile";

export function PreferencesForm({ initial }: { initial: ProfilePreferences }) {
  const [prefs, setPrefs] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function toggle(key: "emailUpdates" | "productNews", value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setSaving(true);
    await updatePreferences({ [key]: value });
    setSaving(false);
  }

  return (
    <div className="space-y-md">
      <div className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
        <div>
          <p className="font-sans text-body-lg text-on-surface">Email updates</p>
          <p className="font-sans text-xs text-on-surface-variant">
            Occasional emails about your account, like a Gemini key expiring.
          </p>
        </div>
        <Switch checked={prefs.emailUpdates} onCheckedChange={(v) => toggle("emailUpdates", v)} disabled={saving} />
      </div>
      <div className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
        <div>
          <p className="font-sans text-body-lg text-on-surface">Product news</p>
          <p className="font-sans text-xs text-on-surface-variant">Occasional emails about new features.</p>
        </div>
        <Switch checked={prefs.productNews} onCheckedChange={(v) => toggle("productNews", v)} disabled={saving} />
      </div>
    </div>
  );
}
