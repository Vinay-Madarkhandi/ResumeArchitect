"use client";

import { useActionState } from "react";
import { updateTrackerReminders } from "@/app/actions/tracker";
import { Button } from "@/components/ui/Button";

export function TrackerReminders({ enabled }: { enabled: boolean }) {
  const [message, action, pending] = useActionState(updateTrackerReminders, "");
  return (
    <section className="max-w-2xl space-y-3 rounded-lg border border-line bg-panel p-5">
      <h2 className="text-lead font-semibold">Job tracker reminders</h2>
      <form action={action} className="space-y-3">
        <label className="flex w-fit items-center gap-2 text-body">
          <input type="checkbox" name="enabled" defaultChecked={enabled} className="accent-brass" />
          Email me a daily digest
        </label>
        <p className="text-small text-ink-2">The digest runs at 08:00 UTC and includes interviews and follow-ups due that day.</p>
        <Button type="submit" size="sm" loading={pending}>Save reminders</Button>
        <p role="status" className="text-small text-ink-2">{message}</p>
      </form>
    </section>
  );
}
