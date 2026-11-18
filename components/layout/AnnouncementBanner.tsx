import { cookies } from "next/headers";
import { X } from "lucide-react";
import { dismissAnnouncement } from "@/app/actions/announcements";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { currentUser } from "@/lib/auth/current-user";
import { activeAnnouncement, dismissalCookie } from "@/lib/data/announcements";

export async function AnnouncementBanner() {
  const user = await currentUser();
  if (!user) return null;
  const announcement = await activeAnnouncement();
  if (!announcement) return null;

  const store = await cookies();
  if (store.get(dismissalCookie(user.id))?.value.split(",").includes(announcement.id)) return null;

  const warning = announcement.level === "warning";
  const label = warning ? "Warning" : announcement.level === "maintenance" ? "Maintenance" : "Announcement";
  return (
    <aside aria-label="Service announcement" className="border-b border-line bg-panel">
      <div className="mx-auto flex max-w-6xl items-start gap-3 px-4 py-2 sm:px-6">
        <div className="flex-1 wrap-anywhere py-1.5 text-body text-ink">
          <Badge tone={warning ? "query" : "neutral"} className="mr-2">{label}</Badge>
          <span className="whitespace-pre-wrap">{announcement.body}</span>
        </div>
        <form action={dismissAnnouncement.bind(null, announcement.id)}>
          <Button type="submit" variant="ghost" size="icon" aria-label="Dismiss announcement"><X aria-hidden /></Button>
        </form>
      </div>
    </aside>
  );
}
