"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { MenuIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  isActiveRoute,
  NAV_ITEMS,
  SECONDARY_NAV_ITEMS,
  type NavItem,
} from "@/lib/nav"
import { cn } from "@/lib/utils"

/**
 * The narrow-viewport navigation drawer.
 *
 * Base UI's Sheet handles the focus trap and restores focus to the trigger on
 * close; all this adds is closing on navigation, which the router does not do
 * on its own.
 */
export function MobileNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            aria-label="Open navigation"
          />
        }
      >
        <MenuIcon aria-hidden />
      </SheetTrigger>

      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle>Navigation</SheetTitle>
        </SheetHeader>

        <nav aria-label="Primary" className="flex flex-col gap-4 px-4 pb-6">
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <DrawerLink
                key={item.href}
                item={item}
                pathname={pathname}
                onNavigate={() => setOpen(false)}
              />
            ))}
          </ul>

          {/* The drawer has the room the top bar does not, so the vocabulary
              pages are listed here rather than hidden behind the account
              menu alone. */}
          <div className="flex flex-col gap-1">
            <h3 className="px-3 text-xs font-medium text-muted-foreground uppercase">
              Vocabulary
            </h3>
            <ul className="flex flex-col gap-1">
              {SECONDARY_NAV_ITEMS.map((item) => (
                <DrawerLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  onNavigate={() => setOpen(false)}
                />
              ))}
            </ul>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  )
}

function DrawerLink({
  item: { href, label, Icon, description },
  pathname,
  onNavigate,
}: {
  item: NavItem
  pathname: string
  onNavigate: () => void
}) {
  const active = isActiveRoute(pathname, href)

  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        // The router does not close the drawer on navigation, so the link does
        // it directly rather than through an effect watching the pathname.
        onClick={onNavigate}
        className={cn(
          // min-h-11 keeps every row past the 44px touch target, which the
          // two-line variant clears anyway but the one-line one would not.
          "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
          "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
          active
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        )}
      >
        <Icon className="size-4 shrink-0" aria-hidden />
        <span className="flex flex-col gap-0.5">
          {label}
          {description && (
            <span className="text-xs font-normal text-muted-foreground">
              {description}
            </span>
          )}
        </span>
      </Link>
    </li>
  )
}
