"use client"

import { cn } from "@/lib/utils"

import { useFilters } from "./filter-provider"

/**
 * Dims and fades the result set while the server re-renders it.
 *
 * The rows themselves stay server-rendered — this only reads the transition's
 * pending flag and passes `children` straight through, so no data crosses the
 * client boundary.
 */
export function ResultsShell({ children }: { children: React.ReactNode }) {
  const { pending } = useFilters()

  return (
    <div
      aria-busy={pending || undefined}
      className={cn(
        "animate-fade-in transition-opacity",
        pending && "is-pending",
      )}
    >
      {children}
    </div>
  )
}
