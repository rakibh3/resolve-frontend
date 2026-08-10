"use client"

import { RotateCcwIcon, TriangleAlertIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * A per-card error boundary fallback.
 *
 * Each insights card owns its own boundary so a single failing endpoint costs
 * one card, not the page.
 */
export function InsightCardError({
  title,
  message,
  reset,
}: {
  title: string
  message: string
  reset: () => void
}) {
  return (
    <section className="flex flex-col items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
      <h2 className="flex items-center gap-2 font-heading text-lg font-semibold tracking-tight">
        <TriangleAlertIcon className="size-4 text-destructive" aria-hidden />
        {title}
      </h2>
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button size="sm" variant="outline" onClick={reset}>
        <RotateCcwIcon aria-hidden />
        Retry
      </Button>
    </section>
  )
}

export function InsightCardSkeleton({ height = 220 }: { height?: number }) {
  return <Skeleton className="rounded-xl" style={{ height }} />
}
