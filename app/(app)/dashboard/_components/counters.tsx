import { AlarmClockIcon, CalendarCheckIcon } from "lucide-react"

import { AnimatedNumber } from "@/components/motion/animated-number"
import { FadeInUp } from "@/components/motion/fade-in-up"
import { cn } from "@/lib/utils"

/**
 * The two headline figures.
 *
 * Overdue is emphasised because it is the one that needs a decision; due-today
 * is the plan. Both carry a label, so neither depends on colour to be read.
 */
export function Counters({
  dueCount,
  overdueCount,
}: {
  dueCount: number
  overdueCount: number
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <CounterCard
        index={0}
        label="Due today"
        value={dueCount}
        Icon={CalendarCheckIcon}
      />
      <CounterCard
        index={1}
        label="Overdue"
        value={overdueCount}
        Icon={AlarmClockIcon}
        urgent={overdueCount > 0}
      />
    </div>
  )
}

function CounterCard({
  label,
  value,
  Icon,
  index,
  urgent = false,
}: {
  label: string
  value: number
  Icon: typeof AlarmClockIcon
  index: number
  urgent?: boolean
}) {
  return (
    <FadeInUp
      index={index}
      className={cn(
        "flex items-center gap-4 rounded-xl border p-4",
        urgent
          ? "border-state-overdue-foreground/25 bg-state-overdue/60"
          : "border-border bg-card",
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          urgent
            ? "bg-state-overdue text-state-overdue-foreground"
            : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-5" aria-hidden />
      </span>

      <div className="flex flex-col">
        <span
          className={cn(
            "font-heading text-3xl font-semibold tracking-tight",
            urgent && "text-state-overdue-foreground",
          )}
        >
          <AnimatedNumber value={value} label={`${value} ${label}`} />
        </span>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
    </FadeInUp>
  )
}
