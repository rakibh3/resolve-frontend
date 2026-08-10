"use client"

import { useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { addLocalDays, localDaysBetween, todayInZone } from "@/lib/date"
import { LIMITS } from "@/lib/validation"

const PRESETS = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "1 year", days: 365 },
] as const

/**
 * Writes `from`/`to` into the URL as `yyyy-MM-dd`.
 *
 * The 365-day cap is the backend's `MAX_INSIGHTS_RANGE_DAYS`; an inverted or
 * over-long range is a 400, so both are prevented here.
 */
export function RangePicker({ timezone }: { timezone: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  const today = todayInZone(timezone)
  const from = searchParams.get("from") ?? ""
  const to = searchParams.get("to") ?? ""

  const span = from && to ? localDaysBetween(from, to) + 1 : null
  const inverted = span !== null && span <= 0
  const tooLong = span !== null && span > LIMITS.insightsRangeDays

  const apply = (nextFrom?: string, nextTo?: string) => {
    const next = new URLSearchParams(searchParams.toString())
    if (nextFrom) next.set("from", nextFrom)
    else next.delete("from")
    if (nextTo) next.set("to", nextTo)
    else next.delete("to")
    const query = next.toString()
    startTransition(() =>
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      }),
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      {/* Presets and the custom range share one row and push apart, so the
          toolbar spans the card instead of bunching against the left edge. */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        {/* Labelled and sized like the From/To fields so all three groups share
            one label row and one control row. Matching control heights is what
            makes `items-end` line them up — a shorter button bottom-aligns but
            its centre then sits below the fields'. Grouped with role=group
            rather than fieldset/legend: a <legend> is laid out specially inside
            a flex fieldset and ignores the container's gap, which drops it out
            of line with the sibling labels. */}
        <div
          role="group"
          aria-labelledby="range-preset-label"
          className="flex flex-col gap-1"
        >
          <span id="range-preset-label" className="text-xs text-muted-foreground">
            Range
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {PRESETS.map((preset) => {
              const presetFrom = addLocalDays(today, -(preset.days - 1))
              const active = from === presetFrom && to === today
              return (
                <Button
                  key={preset.days}
                  variant={active ? "default" : "outline"}
                  aria-pressed={active}
                  disabled={pending}
                  onClick={() => apply(presetFrom, today)}
                >
                  {preset.label}
                </Button>
              )
            })}
            {(from || to) && (
              <Button
                variant="ghost"
                disabled={pending}
                onClick={() => apply(undefined, undefined)}
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <span id="range-from-label" className="text-xs text-muted-foreground">
              From
            </span>
            <DatePicker
              id="range-from"
              labelId="range-from-label"
              value={from}
              max={to || today}
              onChange={(value) => apply(value, to || undefined)}
              placeholder="Start date"
              className="w-44"
            />
          </div>

          <div className="flex flex-col gap-1">
            <span id="range-to-label" className="text-xs text-muted-foreground">
              To
            </span>
            <DatePicker
              id="range-to"
              labelId="range-to-label"
              value={to}
              min={from || undefined}
              max={today}
              onChange={(value) => apply(from || undefined, value)}
              placeholder="End date"
              className="w-44"
            />
          </div>

          {span !== null && !inverted && !tooLong && (
            <p className="pb-2 text-xs text-muted-foreground tabular-nums">
              {span} {span === 1 ? "day" : "days"}
            </p>
          )}
        </div>
      </div>

      {inverted && (
        <p role="alert" className="text-sm text-destructive">
          The start date must not be after the end date.
        </p>
      )}
      {tooLong && (
        <p role="alert" className="text-sm text-destructive">
          Ranges are limited to {LIMITS.insightsRangeDays} days.
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        Dates are calendar days in {timezone}.
      </p>
    </div>
  )
}
