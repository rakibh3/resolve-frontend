import { MinusIcon, TrendingDownIcon, TrendingUpIcon } from "lucide-react"

import { AnimatedNumber } from "@/components/motion/animated-number"
import { getBacklogInsights, type InsightsRange } from "@/lib/api/insights"
import { formatLocalDate } from "@/lib/date"

import { BacklogChart } from "./backlog-chart"

export async function BacklogCard({ range }: { range: InsightsRange }) {
  const backlog = await getBacklogInsights(range)

  const first = backlog.trend.at(0)?.overdueCount ?? 0
  const last = backlog.trend.at(-1)?.overdueCount ?? 0
  const delta = last - first

  // Direction is carried by an icon and a word, not by colour alone.
  const { Icon, label } =
    delta > 0
      ? { Icon: TrendingUpIcon, label: "Growing" }
      : delta < 0
        ? { Icon: TrendingDownIcon, label: "Shrinking" }
        : { Icon: MinusIcon, label: "Flat" }

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-heading text-lg font-semibold tracking-tight">
          Backlog
        </h2>
        <p className="text-sm text-muted-foreground">
          {formatLocalDate(backlog.range.from)} –{" "}
          {formatLocalDate(backlog.range.to)}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <div className="flex flex-col gap-0.5">
          <span className="font-heading text-3xl font-semibold tracking-tight">
            <AnimatedNumber
              value={backlog.overdueCount}
              label={`${backlog.overdueCount} overdue right now`}
            />
          </span>
          <span className="text-sm text-muted-foreground">Overdue now</span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Icon className="size-4 text-muted-foreground" aria-hidden />
          <span>
            {label} over this range
            <span className="text-muted-foreground tabular-nums">
              {" "}
              ({delta > 0 ? "+" : ""}
              {delta})
            </span>
          </span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        The figure above is the current total. The chart is the overdue count at
        the <em>end of each day</em> — the two answer different questions.
      </p>

      <BacklogChart trend={backlog.trend} />
    </section>
  )
}
