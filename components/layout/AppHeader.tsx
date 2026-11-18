"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Briefcase, ContactRound, LogOut, MessagesSquare, PenLine, Plus, Settings, UserRound } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { buttonVariants } from "@/components/ui/Button";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from "@/components/ui/Menu";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/dashboard", label: "Applications", icon: Briefcase },
  { href: "/linkedin", label: "LinkedIn review", icon: ContactRound },
  { href: "/interview", label: "Interview prep", icon: MessagesSquare },
  { href: "/cover-letter", label: "Cover letter scan", icon: PenLine },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppHeader({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function leaveAccount() {
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ground/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Logo href="/dashboard" />
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative rounded-md px-3 py-1.5 text-body text-ink-3 transition-colors hover:text-ink",
                  active && "text-ink after:absolute after:inset-x-3 after:-bottom-[13px] after:h-0.5 after:rounded-full after:bg-brass",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <Link href="/new" className={cn(buttonVariants({ variant: "primary", size: "sm" }), "mr-1.5")}>
            <Plus aria-hidden /> New application
          </Link>
          <ThemeToggle />
          <Menu>
            <MenuTrigger className="rounded-md p-2 text-ink-3 transition-colors hover:bg-hover hover:text-ink" aria-label="Account">
              <UserRound className="size-4" />
            </MenuTrigger>
            <MenuContent>
              <MenuLabel className="max-w-56 truncate">{email}</MenuLabel>
              <MenuSeparator />
              {NAV.map(({ href, label, icon: Icon }) => (
                <MenuItem key={href} onSelect={() => router.push(href)} className="lg:hidden">
                  <Icon aria-hidden /> {label}
                </MenuItem>
              ))}
              <MenuItem onSelect={leaveAccount}>
                <LogOut /> Sign out
              </MenuItem>
            </MenuContent>
          </Menu>
        </div>
      </div>
    </header>
  );
}
