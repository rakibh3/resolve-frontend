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
                  "interactive-lift flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium",
                  "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
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
