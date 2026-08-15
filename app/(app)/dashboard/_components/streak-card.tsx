import { FlameIcon } from "lucide-react"

import { AnimatedNumber } from "@/components/motion/animated-number"
import { FadeInUp } from "@/components/motion/fade-in-up"
import { ProgressRing } from "@/components/motion/progress-ring"

/**
 * The streak is consecutive local days with at least one attempt, counting back
 * from today — and a missing today does not break a streak that is current
 * through yesterday, so it does not read as broken at 9am.
 *
 * The ring is proportional to a 30-day horizon: an arbitrary but stable frame,
 * since a streak has no natural maximum.
 */
const RING_HORIZON_DAYS = 30

export function StreakCard({ streak }: { streak: number }) {
  if (streak === 0) {
    return (
      <FadeInUp
        index={2}
        className="flex flex-col gap-2 rounded-none border-2 border-foreground bg-card p-5 shadow-[var(--shadow-neo)]"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <FlameIcon className="size-4 text-muted-foreground" aria-hidden />
          No streak yet
        </span>
        <p className="text-sm text-muted-foreground">
          Log one attempt today and the streak starts counting.
        </p>
      </FadeInUp>
    )
  }

  return (
    <FadeInUp
      index={2}
      className="flex items-center gap-4 rounded-none border-2 border-foreground bg-card p-5 shadow-[var(--shadow-neo)]"
    >
      <ProgressRing
        value={Math.min(streak / RING_HORIZON_DAYS, 1)}
        size={84}
        label={`Current streak: ${streak} ${streak === 1 ? "day" : "days"}`}
      >
        <span className="font-heading text-xl font-semibold tracking-tight">
          <AnimatedNumber value={streak} label={`${streak} days`} />
        </span>
      </ProgressRing>

      <div className="flex flex-col gap-1">
        <span className="flex items-center gap-2 text-sm font-medium">
          <FlameIcon className="size-4 text-[var(--chart-1)]" aria-hidden />
          {streak === 1 ? "1 day streak" : `${streak} day streak`}
        </span>
        <p className="text-sm text-muted-foreground">
          Consecutive days with at least one logged attempt.
        </p>
      </div>
    </FadeInUp>
  )
}
