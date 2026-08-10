"use client"

import { AreaChart } from "@/components/charts/area-chart"
import { Area } from "@/components/charts/area"
import { Grid } from "@/components/charts/grid"
import { ChartTooltip } from "@/components/charts/tooltip"
import type { BacklogPoint } from "@/lib/api/types"
import { formatLocalDate } from "@/lib/date"

/**
 * The end-of-day overdue series.
 *
 * The `revealSignature` changes with the data, which replays the reveal
 * animation when the range changes rather than letting the new series snap into
 * place. Colours come from the chart tokens only.
 */
export function BacklogChart({ trend }: { trend: BacklogPoint[] }) {
  const data = trend.map((point) => ({
    date: point.date,
    overdue: point.overdueCount,
  }))

  return (
    <AreaChart
      data={data}
      // Must be the `yyyy-MM-dd` date, not a display label: this is a time
      // series, and the shell positions every point with
      // `new Date(d[xDataKey])`. A label like "9 Aug" carries no year, so V8
      // resolves it to the *current* year and a multi-year range collapses onto
      // one — which is what put the rise in the middle of the chart instead of
      // at its end. Positioning through Date is safe here where display is not:
      // every point shifts by the same offset, so order and spacing hold, and
      // the tooltip still formats the LocalDate lexically.
      xDataKey="date"
      aspectRatio="5 / 2"
      margin={{ top: 16, right: 12, bottom: 24, left: 32 }}
      revealSignature={trend
        .map((point) => `${point.date}:${point.overdueCount}`)
        .join("|")}
    >
      <Grid />
      <Area
        dataKey="overdue"
        fill="var(--chart-5)"
        stroke="var(--chart-5)"
        fillOpacity={0.3}
      />
      <ChartTooltip
        rows={(point) => [
          {
            label: formatLocalDate(String(point.date), "long"),
            value: `${point.overdue} overdue`,
            color: "var(--chart-5)",
          },
        ]}
      />
    </AreaChart>
  )
}
