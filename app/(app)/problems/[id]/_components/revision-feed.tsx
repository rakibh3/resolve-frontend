import { stageLabel } from "@/components/domain/stage-label"
import type { RevisionEvent, RevisionEventType } from "@/lib/api/types"
import { formatInstant } from "@/lib/date"

/**
 * Human copy per event type. `stage` is nullable on some events, so the label
 * has to work without it.
 */
function describe(event: RevisionEvent): string {
  const stage = event.stage ? stageLabel(event.stage) : null

  const copy: Record<RevisionEventType, string> = {
    CYCLE_STARTED: "Revision cycle started",
    COMPLETED: stage ? `Completed ${stage}` : "Stage completed",
    ADVANCED: stage ? `Advanced to ${stage}` : "Advanced a stage",
    REPEATED: stage
      ? `Repeating ${stage} — solved with a hint`
      : "Repeating the stage — solved with a hint",
    RESET: "Cycle reset — solution viewed",
    RESCHEDULED: "Rescheduled",
    MASTERED: "Mastered",
    REINFORCEMENT_STARTED: "Reinforcement cycle started",
  }

  return copy[event.type]
}

/**
 * The audit log.
 *
 * Every event except `RESCHEDULED` is derived and is deleted and rewritten on
 * each schedule replay, so `RevisionEvent.id` is NOT stable across refetches.
 * Keys come from `type + createdAt` for that reason — do not "fix" this to use
 * `id`.
 */
export function RevisionFeed({
  events,
  timezone,
}: {
  events: RevisionEvent[]
  timezone: string
}) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No revision events yet.
      </p>
    )
  }

  return (
    <ol className="flex flex-col gap-3">
      {events.map((event, index) => (
        <li
          key={`${event.type}-${event.createdAt}-${index}`}
          className="flex flex-col gap-0.5 border-l-2 border-border pl-3"
        >
          <span className="text-sm font-medium">{describe(event)}</span>

          {event.reason && (
            <span className="text-sm text-muted-foreground">
              {event.reason}
            </span>
          )}

          {/* fromDueAt / toDueAt are instants, formatted in the owner's zone. */}
          {event.fromDueAt && event.toDueAt && (
            <span className="text-xs text-muted-foreground">
              {formatInstant(event.fromDueAt, timezone, "d MMM yyyy")} →{" "}
              {formatInstant(event.toDueAt, timezone, "d MMM yyyy")}
            </span>
          )}

          <time
            dateTime={event.createdAt}
            className="text-xs text-muted-foreground"
          >
            {formatInstant(event.createdAt, timezone)}
          </time>
        </li>
      ))}
    </ol>
  )
}
