import { CheckIcon, CircleIcon, DotIcon } from "lucide-react"

import { stageLabel } from "@/components/domain/stage-label"
import { enterDelayStyle } from "@/lib/motion"
import type { TimelineEntry } from "@/lib/api/types"
import { formatLocalDate } from "@/lib/date"
import { cn } from "@/lib/utils"

/**
 * The stage projection, however many rungs the server sends.
 *
 * The ladder is six stages (`DAY_0 → DAY_1 → DAY_3 → DAY_7 → DAY_15 → DAY_30`),
 * but this renders `timeline` as given rather than assuming a length — a
 * reinforcement cycle skips `DAY_3` and so produces a shorter list.
 *
 * Every date here comes from the server's `timeline`. Nothing is derived from
 * the anchor plus a stage offset — the engine owns that arithmetic, and a
 * reschedule means the offsets no longer describe the real dates anyway.
 */
export function RevisionTimeline({ timeline }: { timeline: TimelineEntry[] }) {
  return (
    <ol className="flex flex-col gap-0 sm:flex-row sm:gap-0">
      {timeline.map((entry, index) => (
        <li
          key={entry.stage}
          className="animate-fade-in-up flex flex-1 items-start gap-3 sm:flex-col sm:gap-2"
          style={enterDelayStyle(index)}
        >
          <div className="flex flex-col items-center sm:w-full sm:flex-row">
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full border",
                entry.status === "completed" &&
                  "border-transparent bg-state-mastered text-state-mastered-foreground",
                entry.status === "current" &&
                  "border-transparent bg-state-due text-state-due-foreground ring-2 ring-state-due-foreground/30",
                entry.status === "upcoming" &&
                  "border-border bg-muted text-muted-foreground",
              )}
            >
              {entry.status === "completed" ? (
                <CheckIcon className="size-3.5" aria-hidden />
              ) : entry.status === "current" ? (
                <CircleIcon className="size-2.5 fill-current" aria-hidden />
              ) : (
                <DotIcon className="size-4" aria-hidden />
              )}
            </span>

            {index < timeline.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "my-1 w-px flex-1 sm:my-0 sm:mx-2 sm:h-px sm:w-full",
                  entry.status === "completed" ? "bg-state-mastered" : "bg-border",
                )}
              />
            )}
          </div>

          <div className="flex flex-col pb-4 sm:pb-0">
            <span
              className={cn(
                "text-sm font-medium",
                entry.status === "current" && "text-state-due-foreground",
              )}
            >
              {stageLabel(entry.stage)}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatLocalDate(entry.date)}
            </span>
            <span className="sr-only">
              {entry.status === "completed"
                ? "Completed"
                : entry.status === "current"
                  ? "Current stage"
                  : "Upcoming"}
            </span>
          </div>
        </li>
      ))}
    </ol>
  )
}
