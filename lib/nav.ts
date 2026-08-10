import {
  BarChart3Icon,
  LayoutDashboardIcon,
  LibraryIcon,
  SettingsIcon,
  TagsIcon,
  type LucideIcon,
} from "lucide-react"

export type NavItem = {
  href: string
  label: string
  Icon: LucideIcon
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/dashboard", label: "Today", Icon: LayoutDashboardIcon },
  { href: "/problems", label: "Library", Icon: LibraryIcon },
  { href: "/topics", label: "Topics", Icon: TagsIcon },
  { href: "/insights", label: "Insights", Icon: BarChart3Icon },
  { href: "/settings", label: "Settings", Icon: SettingsIcon },
]

/**
 * Whether a nav item is the active route.
 *
 * Prefix-matched so `/problems/abc` still highlights Library, but `/` never
 * matches everything.
 */
export function isActiveRoute(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}
