import {
  BarChart3Icon,
  BookOpenIcon,
  LayoutDashboardIcon,
  LibraryIcon,
  SettingsIcon,
  TagsIcon,
  WaypointsIcon,
  type LucideIcon,
} from "lucide-react"

export type NavItem = {
  href: string
  label: string
  Icon: LucideIcon
  /** One line of copy for the drawer, where there is room for it. */
  description?: string
}

/**
 * The primary bar, deliberately held at five.
 *
 * Recall earns a slot because it is a daily destination — the sheet is what
 * gets skimmed before an interview. The two vocabulary pages do not: they are
 * places you visit to tidy up, not to work, and putting seven or eight items in
 * a top bar makes every one of them harder to find. They live in
 * `SECONDARY_NAV_ITEMS` instead.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  {
    href: "/dashboard",
    label: "Today",
    Icon: LayoutDashboardIcon,
    description: "What is due now",
  },
  {
    href: "/problems",
    label: "Library",
    Icon: LibraryIcon,
    description: "Every problem you have captured",
  },
  {
    href: "/recall",
    label: "Recall",
    Icon: BookOpenIcon,
    description: "Your write-ups, grouped by technique",
  },
  {
    href: "/insights",
    label: "Insights",
    Icon: BarChart3Icon,
    description: "Where you are strong and weak",
  },
  {
    href: "/settings",
    label: "Settings",
    Icon: SettingsIcon,
    description: "Timezone and reminders",
  },
]

/** Vocabulary management: reachable from the drawer and the account menu. */
export const SECONDARY_NAV_ITEMS: readonly NavItem[] = [
  {
    href: "/topics",
    label: "Topics",
    Icon: TagsIcon,
    description: "What problems are about",
  },
  {
    href: "/patterns",
    label: "Patterns",
    Icon: WaypointsIcon,
    description: "How you solve them",
  },
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
