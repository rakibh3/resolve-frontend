import {
  AlarmClockIcon,
  CalendarClockIcon,
  CircleDashedIcon,
  RepeatIcon,
  TrophyIcon,
  type LucideIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { PracticeState } from "@/lib/api/types"
import { cn } from "@/lib/utils"

/**
 * The single definition of how a practice state looks and reads.
 *
 * `practiceState` is re-derived by the backend on every read against today in
 * the owner's timezone. It is rendered exactly as given — never recomputed here
 * — and `null` means the problem has never been attempted, which is a different
 * fact from any of the five states.
 *
 * Every entry carries an icon and a label, so the meaning survives without
 * colour.
 */
const PRESENTATION: Record<
  PracticeState,
  { label: string; description: string; Icon: LucideIcon; className: string }
> = {
  SCHEDULED: {
    label: "Scheduled",
    description: "Next revision is in the future",
    Icon: CalendarClockIcon,
    className: "bg-state-scheduled text-state-scheduled-foreground",
  },
  DUE: {
    label: "Due",
    description: "Due today",
    Icon: AlarmClockIcon,
    className: "bg-state-due text-state-due-foreground",
  },
  OVERDUE: {
    label: "Overdue",
    description: "Past its due date",
    Icon: AlarmClockIcon,
    className: "bg-state-overdue text-state-overdue-foreground",
  },
  MASTERED: {
    label: "Mastered",
    description: "Completed the full revision cycle",
    Icon: TrophyIcon,
    className: "bg-state-mastered text-state-mastered-foreground",
  },
  NEEDS_REINFORCEMENT: {
    label: "Reinforcing",
    description: "Finished the cycle with low confidence",
    Icon: RepeatIcon,
    className: "bg-state-reinforcement text-state-reinforcement-foreground",
  },
}

const NOT_STARTED = {
  label: "Not started",
  description: "No attempt logged yet, so there is no revision cycle",
  Icon: CircleDashedIcon,
  className: "bg-state-idle text-state-idle-foreground",
}

export function PracticeStateBadge({
  state,
  className,
}: {
  state: PracticeState | null
  className?: string
}) {
  const { label, description, Icon, className: tone } =
    state === null ? NOT_STARTED : PRESENTATION[state]

  return (
    <Badge className={cn(tone, className)} title={description}>
      <Icon aria-hidden />
      {label}
    </Badge>
  )
}

export function practiceStateLabel(state: PracticeState | null): string {
  return state === null ? NOT_STARTED.label : PRESENTATION[state].label
}
