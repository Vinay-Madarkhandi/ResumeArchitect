"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, LogOut, Menu as MenuIcon, ScanSearch, UserRound, X } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { buttonVariants } from "@/components/ui/Button";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from "@/components/ui/Menu";
import { navFor, owns, type NavArea } from "@/lib/nav";
import { cn } from "@/lib/cn";

const linkClass = (active: boolean) =>
  cn(
    "relative inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-body text-ink-3 transition-colors hover:text-ink",
    active && "text-ink after:absolute after:inset-x-3 after:-bottom-[13px] after:h-0.5 after:rounded-full after:bg-brass",
  );

/** Closes a disclosure on Escape (returning focus), on a click outside, and when focus leaves it. */
function useDismiss(open: boolean, close: (restoreFocus: boolean) => void, region: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (region.current && !region.current.contains(event.target as Node)) close(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(true);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close, region]);
}

/** An area with several destinations: a button that discloses a short list of links. */
function AreaMenu({ area, pathname }: { area: Extract<NavArea, { children: readonly unknown[] }>; pathname: string }) {
  const [open, setOpen] = useState(false);
  const region = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const active = owns(area, pathname);

  useDismiss(open, (restoreFocus) => {
    setOpen(false);
    if (restoreFocus) button.current?.focus();
  }, region);

  return (
    <div
      ref={region}
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        data-current={active || undefined}
        onClick={() => setOpen((v) => !v)}
        className={linkClass(active)}
      >
        {area.label}
        <ChevronDown className={cn("size-3.5 transition-transform duration-150", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <ul
          id={panelId}
          className="absolute left-0 top-full z-50 mt-2.5 w-72 rounded-md border border-line bg-raised p-1 shadow-pop"
        >
          {area.children.map((leaf) => {
            const here = pathname === leaf.href || pathname.startsWith(`${leaf.href}/`);
            return (
              <li key={leaf.href}>
                <Link
                  href={leaf.href}
                  aria-current={here ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block rounded-sm px-2.5 py-2 hover:bg-hover focus-visible:bg-hover",
                    here && "bg-hover",
                  )}
                >
                  <span className="flex items-center gap-2 text-body text-ink">
                    {leaf.label}
                    {here && <span className="size-1.5 rounded-full bg-brass" aria-hidden />}
                  </span>
                  <span className="block text-label text-ink-3">{leaf.hint}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function MobileMenu({ areas, pathname }: { areas: readonly NavArea[]; pathname: string }) {
  const [open, setOpen] = useState(false);
  const region = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const close = () => setOpen(false);

  useDismiss(open, (restoreFocus) => {
    setOpen(false);
    if (restoreFocus) button.current?.focus();
  }, region);

  const rowClass = (here: boolean) =>
    cn(
      "flex min-h-11 items-center gap-2 rounded-md px-3 text-lead text-ink-2 hover:bg-hover hover:text-ink",
      here && "bg-hover text-ink",
    );

  return (
    <div ref={region} className="lg:hidden">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label="Menu"
        onClick={() => setOpen((v) => !v)}
        className="rounded-md p-2 text-ink-3 transition-colors hover:bg-hover hover:text-ink"
      >
        {open ? <X className="size-4" aria-hidden /> : <MenuIcon className="size-4" aria-hidden />}
      </button>
      {open && (
        <div
          id={panelId}
          className="absolute inset-x-0 top-full max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-b border-line bg-ground px-3 pb-4 pt-3 shadow-pop"
        >
          <Link href="/scan" onClick={close} className={cn(buttonVariants({ variant: "primary", size: "lg" }), "mb-3 w-full sm:hidden")}>
            <ScanSearch aria-hidden /> Scan a resume
          </Link>
          <nav aria-label="Main" className="mx-auto max-w-6xl">
            <ul className="flex flex-col gap-0.5">
              {areas.map((area) =>
                area.children ? (
                  <li key={area.id} className="my-1 border-y border-line py-2">
                    <p className="px-3 pb-1 text-small font-medium text-ink-3">{area.label}</p>
                    <ul className="flex flex-col gap-0.5">
                      {area.children.map((leaf) => {
                        const here = pathname === leaf.href || pathname.startsWith(`${leaf.href}/`);
                        return (
                          <li key={leaf.href}>
                            <Link href={leaf.href} onClick={close} aria-current={here ? "page" : undefined} className={rowClass(here)}>
                              {leaf.label}
                              {here && <span className="ml-auto size-1.5 rounded-full bg-brass" aria-hidden />}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ) : (
                  <li key={area.id}>
                    <Link
                      href={area.href}
                      onClick={close}
                      aria-current={owns(area, pathname) ? "page" : undefined}
                      className={rowClass(owns(area, pathname))}
                    >
                      {area.label}
                      {owns(area, pathname) && <span className="ml-auto size-1.5 rounded-full bg-brass" aria-hidden />}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </nav>
        </div>
      )}
    </div>
  );
}

export function AppHeader({ email, admin = false }: { email: string; admin?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const areas = navFor(admin);

  async function leaveAccount() {
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ground/90 backdrop-blur-md">
      <div className="relative mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Logo href="/dashboard" />
        <nav aria-label="Main" className="ml-2 hidden items-center gap-0.5 lg:flex">
          {areas.map((area) =>
            area.children ? (
              <AreaMenu key={area.id} area={area} pathname={pathname} />
            ) : (
              <Link
                key={area.id}
                href={area.href}
                aria-current={owns(area, pathname) ? "page" : undefined}
                className={linkClass(owns(area, pathname))}
              >
                {area.label}
              </Link>
            ),
          )}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <Link href="/scan" className={cn(buttonVariants({ variant: "primary", size: "sm" }), "mr-1.5 hidden sm:inline-flex")}>
            <ScanSearch aria-hidden />
            <span>
              Scan<span className="hidden xl:inline"> a resume</span>
            </span>
          </Link>
          <ThemeToggle />
          <Menu>
            <MenuTrigger className="rounded-md p-2 text-ink-3 transition-colors hover:bg-hover hover:text-ink" aria-label="Account">
              <UserRound className="size-4" />
            </MenuTrigger>
            <MenuContent>
              <MenuLabel className="max-w-56 truncate">{email}</MenuLabel>
              <MenuSeparator />
              <MenuItem onSelect={leaveAccount}>
                <LogOut /> Sign out
              </MenuItem>
            </MenuContent>
          </Menu>
          <MobileMenu areas={areas} pathname={pathname} />
        </div>
      </div>
    </header>
  );
}
