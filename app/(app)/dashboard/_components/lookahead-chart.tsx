"use client"

import { BarChart } from "@/components/charts/bar-chart"
import { Bar } from "@/components/charts/bar"
import { BarXAxis } from "@/components/charts/bar-x-axis"
import { Grid } from "@/components/charts/grid"
import { ChartTooltip } from "@/components/charts/tooltip"
import type { UpcomingDay } from "@/lib/api/types"
import { formatLocalDate, localDateWeekday } from "@/lib/date"

/**
 * The seven days starting tomorrow.
 *
 * Zero-count days arrive from the API and are plotted as zero so the week reads
 * as contiguous. Overdue work is never folded in here — the API excludes it,
 * and the counters above own that number.
 *
 * Axis labels are derived from the `LocalDate` string lexically; nothing goes
 * through browser-locale date parsing.
 */
export function LookaheadChart({ days }: { days: UpcomingDay[] }) {
  /**
   * Weekday only on the axis.
   *
   * Seven bands share the card's width, which is ~42px each on a 360px screen —
   * "Sun 09/08" needs about 58px, so the full date collided with its
   * neighbours. Over a seven-day window a weekday is unambiguous on its own,
   * and the tooltip still carries the full date.
   */
  const data = days.map((day) => ({
    label: localDateWeekday(day.date),
    date: day.date,
    count: day.count,
  }))

  return (
    <BarChart
      data={data}
      xDataKey="label"
      aspectRatio="5 / 2"
      margin={{ top: 16, right: 8, bottom: 28, left: 8 }}
      revealSignature={days.map((day) => `${day.date}:${day.count}`).join("|")}
    >
      <Grid />
      <Bar dataKey="count" fill="var(--chart-1)" minBarHeight={2} />
      {/* Only the X axis: these bars are vertical, so BarXAxis is the category
          axis. BarYAxis is the category axis for the *horizontal* orientation —
          adding it here printed the same seven dates down the left edge. */}
      <BarXAxis maxLabels={7} showAllLabels />
      <ChartTooltip
        rows={(point) => [
          {
            label: formatLocalDate(String(point.date), "long"),
            value: `${point.count} due`,
            color: "var(--chart-1)",
          },
        ]}
      />
    </BarChart>
  )
}
