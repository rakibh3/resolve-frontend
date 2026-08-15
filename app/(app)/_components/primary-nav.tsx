"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { isActiveRoute, NAV_ITEMS } from "@/lib/nav"
import { cn } from "@/lib/utils"

export function PrimaryNav({ className }: { className?: string }) {
  const pathname = usePathname()

  return (
    <nav aria-label="Primary" className={className}>
      <ul className="flex items-center gap-1">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = isActiveRoute(pathname, href)
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "interactive-press flex items-center gap-2 rounded-none px-2.5 py-1.5 text-sm font-bold uppercase tracking-wider border-2",
                  "focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-offset-2",
                  active
                    ? "bg-foreground text-background border-foreground shadow-[var(--shadow-neo-sm)]"
                    : "border-transparent text-foreground hover:border-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
