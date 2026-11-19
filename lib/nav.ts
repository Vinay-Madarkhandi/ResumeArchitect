/**
 * The signed-in navigation: a few areas, each owning the routes that belong
 * to it. The header and the mobile menu both render from this list, so the
 * current-state rule lives in one place.
 */

export interface NavLeaf {
  href: string;
  label: string;
  /** One line shown under the label where a menu has room for it. */
  hint: string;
}

interface NavBase {
  id: string;
  label: string;
  /** Path prefixes that make this area current. */
  owns: readonly string[];
}

export type NavArea =
  | (NavBase & { href: string; children?: undefined })
  | (NavBase & { href?: undefined; children: readonly NavLeaf[] });

export const NAV: readonly NavArea[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", owns: ["/dashboard"] },
  { id: "scan", label: "Scan", href: "/scan", owns: ["/scan", "/scans"] },
  { id: "resumes", label: "Resumes", href: "/resumes", owns: ["/resumes", "/new"] },
  { id: "jobs", label: "Jobs", href: "/tracker", owns: ["/tracker"] },
  {
    id: "career",
    label: "Career tools",
    owns: ["/linkedin", "/interview", "/cover-letter"],
    children: [
      { href: "/linkedin", label: "LinkedIn review", hint: "Keywords recruiters can find" },
      { href: "/interview", label: "Interview prep", hint: "Questions and answer feedback" },
      { href: "/cover-letter", label: "Cover letter scan", hint: "Measure a letter against a job" },
    ],
  },
  { id: "settings", label: "Settings", href: "/settings", owns: ["/settings"] },
];

export const ADMIN_AREA: NavArea = { id: "admin", label: "Admin", href: "/admin", owns: ["/admin"] };

export function navFor(admin: boolean): readonly NavArea[] {
  return admin ? [...NAV, ADMIN_AREA] : NAV;
}

/** True when `pathname` is the prefix itself or sits beneath it. */
export function owns(area: Pick<NavBase, "owns">, pathname: string): boolean {
  return area.owns.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
