"use client"

import Link from "next/link"
import { FilterXIcon, LibraryIcon, TriangleAlertIcon } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"

import { useFilters } from "./filter-provider"

/** The library has nothing in it yet — an onboarding moment, not a failure. */
export function EmptyLibrary() {
  return (
    <div className="flex flex-col items-start gap-3 rounded-none border-2 border-dashed border-foreground p-8 shadow-[var(--shadow-neo)]">
      <span className="flex size-10 items-center justify-center rounded-none bg-muted text-muted-foreground">
        <LibraryIcon className="size-5" aria-hidden />
      </span>
      <h2 className="font-heading text-lg font-semibold tracking-tight">
        Your library is empty
      </h2>
      <p className="max-w-prose text-sm text-muted-foreground">
        Capture a problem to start tracking it. Paste a LeetCode URL and the
        title, difficulty, and topics are filled in for you — or add your own
        from a book or interview.
      </p>
      <Link href="/problems/new" className={buttonVariants()}>
        Add your first problem
      </Link>
    </div>
  )
}

/** Filters are active and matched nothing — a different situation entirely. */
export function NoMatches() {
  const filters = useFilters()

  return (
    <div className="flex flex-col items-start gap-3 rounded-none border-2 border-dashed border-foreground p-8 shadow-[var(--shadow-neo)]">
      <span className="flex size-10 items-center justify-center rounded-none bg-muted text-muted-foreground">
        <FilterXIcon className="size-5" aria-hidden />
      </span>
      <h2 className="font-heading text-lg font-semibold tracking-tight">
        No problems match these filters
      </h2>
      <p className="max-w-prose text-sm text-muted-foreground">
        {filters.activeCount}{" "}
        {filters.activeCount === 1 ? "filter is" : "filters are"} active. Note
        that a status filter also excludes problems you have never attempted.
      </p>
      <Button variant="outline" onClick={filters.clearAll}>
        Clear all filters
      </Button>
    </div>
  )
}

/** The URL carries a value the API rejected — recoverable, not a crash. */
export function InvalidFilters({ message }: { message: string }) {
  const filters = useFilters()

  return (
    <div className="flex flex-col items-start gap-3 rounded-none border-2 border-destructive bg-destructive/5 p-8 shadow-[var(--shadow-neo)]">
      <span className="flex size-10 items-center justify-center rounded-none bg-destructive/10 text-destructive">
        <TriangleAlertIcon className="size-5" aria-hidden />
      </span>
      <h2 className="font-heading text-lg font-semibold tracking-tight">
        Those filters aren&rsquo;t valid
      </h2>
      <p className="max-w-prose text-sm text-muted-foreground">
        The filters in this URL were rejected: {message}
      </p>
      <Button variant="outline" onClick={filters.clearAll}>
        Reset the filters
      </Button>
    </div>
  )
}
