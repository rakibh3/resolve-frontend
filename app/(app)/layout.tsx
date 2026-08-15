import { Suspense } from "react"
import Link from "next/link"
import { PlusIcon, SearchIcon } from "lucide-react"

import { ThemeToggle } from "@/components/theme-toggle"
import { buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

import { MobileNav } from "./_components/mobile-nav"
import { OwnerSlot } from "./_components/owner-slot"
import { PrimaryNav } from "./_components/primary-nav"
import { ReminderBanner } from "./_components/reminder-banner"

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-svh flex-col">
      {/* Both slots stream: neither the owner lookup nor the reminder state
          should hold up the page the owner actually asked for. */}
      <Suspense fallback={null}>
        <ReminderBanner />
      </Suspense>

      <header className="sticky top-0 z-40 border-b-2 border-foreground bg-background">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
          <MobileNav />

          <Link
            href="/dashboard"
            className="font-heading text-sm font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-offset-2"
          >
            ReSolve
          </Link>

          <PrimaryNav className="ml-4 hidden md:block" />

          <div className="ml-auto flex items-center gap-1.5">
            {/* Search is a persistent affordance rather than a nav slot: it is
                reached from wherever you already are, and the top bar is full
                at five items. */}
            <Link
              href="/search"
              aria-label="Search everything you have written"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon-sm" }),
              )}
            >
              <SearchIcon aria-hidden />
            </Link>

            {/* Styled anchors rather than <Button render={<Link/>}>: a link
                that navigates must keep link semantics, not be given
                role="button". */}
            {/* cn() is what applies tailwind-merge. Without it the base
                `inline-flex` and the `hidden` override both survive, and CSS
                source order — not class order — decides, so both variants of
                this button render at once. */}
            <Link
              href="/problems/new"
              className={cn(buttonVariants({ size: "sm" }), "hidden sm:inline-flex")}
            >
              <PlusIcon aria-hidden />
              Add problem
            </Link>
            <Link
              href="/problems/new"
              aria-label="Add problem"
              className={cn(buttonVariants({ size: "icon-sm" }), "sm:hidden")}
            >
              <PlusIcon aria-hidden />
            </Link>

            <ThemeToggle />

            <Suspense fallback={<Skeleton className="size-7 rounded-none" />}>
              <OwnerSlot />
            </Suspense>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  )
}
