import Link from "next/link"

import { FadeInUp } from "@/components/motion/fade-in-up"
import { getTodayDashboard } from "@/lib/api/dashboard"
import { getReminderState } from "@/lib/api/reminders"
import { formatLocalDate } from "@/lib/date"

import { CaughtUp } from "./caught-up"
import { Counters } from "./counters"
import { DueList } from "./due-list"
import { LookaheadChart } from "./lookahead-chart"
import { StreakCard } from "./streak-card"

/**
 * Everything the Today screen shows comes from one `/api/dashboard/today`
 * response — counts, the due list, the recommended slice, the streak, and the
 * lookahead. Nothing here recomputes a figure the server already resolved.
 */
export async function TodaySection() {
  // In parallel, not sequentially: the reminder state must not wait on the
  // dashboard. Both readers are `cache()`-wrapped, so the reminder banner in
  // the layout reuses this response rather than issuing a second request.
  const [dashboard] = await Promise.all([
    getTodayDashboard(),
    getReminderState().catch(() => null),
  ])

  const nothingDue = dashboard.dueCount === 0 && dashboard.overdueCount === 0

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        {formatLocalDate(dashboard.date, "long")} ·{" "}
        <Link
          href="/settings"
          className="underline underline-offset-4 hover:text-foreground"
          title="Every date in ReSolve is derived in this timezone"
        >
          {dashboard.timezone}
        </Link>
      </p>

      {nothingDue ? (
        <CaughtUp />
      ) : (
        <Counters
          dueCount={dashboard.dueCount}
          overdueCount={dashboard.overdueCount}
        />
      )}

      <StreakCard streak={dashboard.streak} />

      {dashboard.due.length > 0 && (
        <DueList
          due={dashboard.due}
          recommendedCount={dashboard.recommended.length}
          timezone={dashboard.timezone}
        />
      )}

      <FadeInUp
        index={3}
        className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
      >
        <div className="flex flex-col gap-0.5">
          <h2 className="font-heading text-lg font-semibold tracking-tight">
            The week ahead
          </h2>
          <p className="text-sm text-muted-foreground">
            Revisions scheduled for the next seven days. Overdue work is not
            included — it is in the counts above.
          </p>
        </div>
        <LookaheadChart days={dashboard.upcoming} />
      </FadeInUp>
    </div>
  )
}
