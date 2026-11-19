"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const items = [
  ["/admin", "Overview"],
  ["/admin/users", "Users"],
  ["/admin/ai-calls", "AI calls"],
  ["/admin/queues", "Queues"],
  ["/admin/audit", "Audit log"],
  ["/admin/announcements", "Announcements"],
  ["/admin/feature-flags", "Feature flags"],
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav aria-label="Administration" className="flex gap-1 overflow-x-auto border-b border-line">
      {items.map(([href, label]) => {
        const active = path === href || (href !== "/admin" && path.startsWith(href + "/"));
        return (
          <Link key={href} href={href} prefetch={false} aria-current={active ? "page" : undefined}
            className={cn("shrink-0 border-b-2 px-3 py-2 text-body transition-colors hover:text-ink",
              active ? "border-brass font-medium text-ink" : "border-transparent text-ink-2")}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
