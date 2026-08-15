import { getActivityInsights, type InsightsRange } from "@/lib/api/insights"
import type { ActivityDay } from "@/lib/api/types"
import { formatLocalDate, localDateWeekday } from "@/lib/date"
import { cn } from "@/lib/utils"

/**
 * One cell per local date across the returned range.
 *
 * The API already fills gaps with `count: 0`, so nothing here infers or
 * synthesizes a day. Dates are rendered lexically from the `LocalDate` string —
 * never parsed by the browser's locale.
 */
export async function ActivityCard({ range }: { range: InsightsRange }) {
  const activity = await getActivityInsights(range)
  const max = Math.max(...activity.days.map((day) => day.count), 1)

  // Column-major weeks, so the grid reads like a calendar.
  const weeks: ActivityDay[][] = []
  for (let index = 0; index < activity.days.length; index += 7) {
    weeks.push(activity.days.slice(index, index + 7))
  }

  return (
    <section className="flex flex-col gap-4 rounded-none border-2 border-foreground bg-card p-5 shadow-[var(--shadow-neo)]">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-lg font-bold tracking-tight">
          Activity
        </h2>
        <p className="text-sm text-muted-foreground">
          {formatLocalDate(activity.range.from)} –{" "}
          {formatLocalDate(activity.range.to)}
        </p>
      </div>

      <div
        role="grid"
        aria-label="Attempts per day"
        // Flush left, so the grid starts on the same edge as the card's heading
        // and the legend beneath it. A short range simply occupies less width
        // rather than floating in the middle of the card.
        className="flex justify-start gap-1 overflow-x-auto pb-2"
      >
        {weeks.map((week, weekIndex) => (
          /* A calendar heatmap is a fixed-density grid: cells read as one
             uniform field, so a column may flex only between a floor and a
             ceiling. Unbounded `flex-1` sizes cells by column count instead of
             by the data — a 90-day range has ~13 columns and would inflate each
             cell to ~100px. Below the floor the container scrolls. */
          <div
            role="row"
            key={weekIndex}
            className="flex min-w-2.5 max-w-4 flex-1 flex-col gap-1"
          >
            {week.map((day) => (
              <div
                role="gridcell"
                key={day.date}
                tabIndex={0}
                aria-label={`${formatLocalDate(day.date, "long")}: ${day.count} ${day.count === 1 ? "attempt" : "attempts"}`}
                title={`${localDateWeekday(day.date, "long")} ${formatLocalDate(day.date, "long")} — ${day.count} ${day.count === 1 ? "attempt" : "attempts"}`}
                className={cn(
                  "aspect-square w-full rounded-[3px] transition-transform",
                  "focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-offset-2",
                  day.count === 0 && "bg-muted",
                )}
                style={
                  day.count > 0
                    ? {
                        backgroundColor: "var(--chart-1)",
                        opacity: 0.25 + (day.count / max) * 0.75,
                      }
                    : undefined
                }
              />
            ))}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Less</span>
        {[0, 0.25, 0.5, 0.75, 1].map((step) => (
          <span
            key={step}
            aria-hidden
            className={cn("size-3 rounded-[3px]", step === 0 && "bg-muted")}
            style={
              step > 0
                ? {
                    backgroundColor: "var(--chart-1)",
                    opacity: 0.25 + step * 0.75,
                  }
                : undefined
            }
          />
        ))}
        <span>More</span>
      </div>
    </section>
  )
}
