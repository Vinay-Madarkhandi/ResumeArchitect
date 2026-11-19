import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Panel } from "@/components/dashboard/Panel";
import { NAV } from "@/lib/nav";

const tools = [
  ...(NAV.find((area) => area.id === "career")?.children ?? []),
  { href: "/settings", label: "Browser clipper", hint: "Save postings to your tracker" },
];

export function CareerTools() {
  return (
    <Panel id="career-tools" title="Career tools">
      <ul className="divide-y divide-line">
        {tools.map((tool) => (
          <li key={tool.href + tool.label}>
            <Link href={tool.href} className="group flex items-center justify-between gap-3 px-4 py-3 hover:bg-hover">
              <span>
                <span className="block text-body font-medium text-ink">{tool.label}</span>
                <span className="block text-small text-ink-3">{tool.hint}</span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-ink-3 transition-colors group-hover:text-ink" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
