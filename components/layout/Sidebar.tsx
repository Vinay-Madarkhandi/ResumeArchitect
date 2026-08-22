"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Icon, type IconName } from "@/components/icon/Icon";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const NAV_ITEMS: { href: string; label: string; icon: IconName }[] = [
  { href: "/library", label: "Library", icon: "library" },
  { href: "/new-tailoring", label: "New Tailoring", icon: "new-tailoring" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-outline-variant bg-surface p-md md:flex">
      <div className="mb-lg">
        <Link href="/library" className="font-sans text-headline-md font-bold text-primary">
          ResumeArchitect
        </Link>
      </div>
      <Link href="/new-tailoring" className="mb-lg">
        <Button variant="primary" className="w-full">
          <Icon name="plus" size={16} />
          New Tailoring
        </Button>
      </Link>
      <ul className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded p-sm font-sans text-body-lg transition-colors",
                  active
                    ? "bg-secondary-container font-medium text-on-secondary-container"
                    : "text-on-surface-variant hover:bg-surface-container-high",
                )}
              >
                <Icon name={item.icon} size={18} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={handleSignOut}
        className="flex items-center gap-2 rounded p-sm font-sans text-body-lg text-on-surface-variant transition-colors hover:bg-surface-container-high"
      >
        <Icon name="sign-out" size={18} />
        Sign out
      </button>
    </nav>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-outline-variant bg-surface-container-lowest md:hidden">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-sm font-mono text-[10px]",
              active ? "text-secondary" : "text-on-surface-variant",
            )}
          >
            <Icon name={item.icon} size={20} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
