import { ApiError } from "@/lib/api/http"
import { getReminderState } from "@/lib/api/reminders"

import { AcknowledgeButton } from "./acknowledge-button"
import { BrowserNotification } from "./browser-notification"
import { ReminderRefresher } from "./reminder-refresher"

/**
 * The API returns `targetPath: "/dashboard/today"`. This app's dashboard is at
 * `/dashboard`, so the path is mapped here rather than reshaping the routes
 * around a string the backend happens to emit.
 */
function mapTargetPath(targetPath: string): string {
  return targetPath === "/dashboard/today" ? "/dashboard" : targetPath
}

/**
 * The daily reminder.
 *
 * All the copy comes from the API's pre-rendered `notification` object so the
 * in-app banner and the browser notification say exactly the same thing, and
 * the wording lives in one place. The counts are rendered as returned — never
 * recomputed from the problem list.
 */
export async function ReminderBanner() {
  let reminder
  try {
    reminder = await getReminderState()
  } catch (error) {
    if (error instanceof ApiError) return <ReminderRefresher />
    throw error
  }

  if (!reminder.active || reminder.acknowledged) return <ReminderRefresher />

  const target = mapTargetPath(reminder.notification.targetPath)

  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-fade-in-up border-b-2 border-foreground bg-warning"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-col gap-0.5">
          <strong className="text-sm font-semibold text-warning-foreground">
            {reminder.notification.title}
          </strong>
          <p className="text-sm text-warning-foreground/90">
            {reminder.notification.body}
          </p>
          <p className="text-xs text-warning-foreground/70">
            {reminder.dueTomorrow} due tomorrow · {reminder.dueToday} due today
            · {reminder.overdueToday} overdue
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <BrowserNotification
            title={reminder.notification.title}
            body={reminder.notification.body}
            targetPath={target}
            localDate={reminder.localDate}
          />
          <AcknowledgeButton />
        </div>
      </div>

      <ReminderRefresher />
    </div>
  )
}
