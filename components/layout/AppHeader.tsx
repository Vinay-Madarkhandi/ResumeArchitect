"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Plus, Settings, UserRound } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { buttonVariants } from "@/components/ui/Button";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from "@/components/ui/Menu";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/dashboard", label: "Applications" },
  { href: "/settings", label: "Settings" },
];

export function AppHeader({ email, admin = false }: { email: string; admin?: boolean }) {
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
        <nav aria-label="Main" className="hidden items-center gap-1 sm:flex">
          {(admin ? [...NAV, { href: "/admin", label: "Admin" }] : NAV).map((item) => {
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
              <MenuItem onSelect={() => router.push("/settings")} className="sm:hidden">
                <Settings /> Settings
              </MenuItem>
              <MenuItem onSelect={() => router.push("/dashboard")} className="sm:hidden">
                <Plus /> Applications
              </MenuItem>
              {admin && <MenuItem onSelect={() => router.push("/admin")} className="sm:hidden">
                <Settings /> Admin
              </MenuItem>}
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
