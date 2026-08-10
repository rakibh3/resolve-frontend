"use client"

import { useState } from "react"
import { CalendarIcon, ClockIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { formatLocalDate, parseLocalDate } from "@/lib/date"
import type { LocalDate } from "@/lib/api/types"
import { cn } from "@/lib/utils"

/**
 * Date entry that matches the rest of the app.
 *
 * The native `<input type="date">` is rejected here on purpose: its rendering
 * is the browser's, not the product's — a grey OS glyph, a `dd/mm/yyyy` segment
 * mask that ignores the type scale, and a popup that inherits none of the theme
 * tokens. It also can't be trusted to sit on the baseline of an `h-8` field.
 *
 * Values stay `LocalDate` (`yyyy-MM-dd`) strings end to end. Nothing is parsed
 * through `new Date(localDate)`, which would reinterpret it in the browser's
 * timezone and land a day early west of UTC.
 */

/** `yyyy-MM-dd` → a `Date` in *local* time, for react-day-picker only. */
function toCalendarDate(value: string): Date | undefined {
  const parts = parseLocalDate(value)
  if (!parts) return undefined
  return new Date(parts.year, parts.month - 1, parts.day)
}

/** A calendar `Date` → `yyyy-MM-dd`, read off its local fields. */
function toLocalDate(date: Date): LocalDate {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

type DatePickerProps = {
  /** `yyyy-MM-dd`, or "" for no selection. */
  value: string
  onChange: (value: LocalDate) => void
  /** Earliest selectable day, inclusive. */
  min?: LocalDate
  /** Latest selectable day, inclusive. */
  max?: LocalDate
  id?: string
  /**
   * Id of the visible field label.
   *
   * A `<label for>` alone makes the label the button's *entire* accessible
   * name, hiding the visible "Pick a date" / date text from assistive tech and
   * from voice control (WCAG 2.5.3, Label in Name). Referencing the label AND
   * the trigger's own id announces both: "New date, 8 August 2026".
   */
  labelId?: string
  /** Submitted with the form when set. */
  name?: string
  placeholder?: string
  invalid?: boolean
  className?: string
}

export function DatePicker({
  value,
  onChange,
  min,
  max,
  id,
  labelId,
  name,
  placeholder = "Pick a date",
  invalid,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const selected = toCalendarDate(value)

  return (
    <>
      {name ? <input type="hidden" name={name} value={value} /> : null}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              id={id}
              type="button"
              variant="outline"
              aria-invalid={invalid || undefined}
              aria-labelledby={labelId && id ? `${labelId} ${id}` : undefined}
              className={cn(
                "w-full justify-start gap-2 font-normal",
                !value && "text-muted-foreground",
                className,
              )}
            />
          }
        >
          <CalendarIcon className="size-3.5 shrink-0" aria-hidden />
          {value ? formatLocalDate(value, "long") : placeholder}
        </PopoverTrigger>

        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            autoFocus
            selected={selected}
            defaultMonth={selected}
            startMonth={min ? toCalendarDate(min) : undefined}
            endMonth={max ? toCalendarDate(max) : undefined}
            disabled={[
              ...(min ? [{ before: toCalendarDate(min) as Date }] : []),
              ...(max ? [{ after: toCalendarDate(max) as Date }] : []),
            ]}
            onSelect={(date) => {
              if (!date) return
              onChange(toLocalDate(date))
              setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
    </>
  )
}

type DateTimePickerProps = {
  /** `yyyy-MM-ddTHH:mm`, or "" for no selection. */
  value: string
  onChange: (value: string) => void
  /** Latest selectable moment, as `yyyy-MM-ddTHH:mm`. */
  max?: string
  id?: string
  /** Id of the visible field label — see `DatePicker`. */
  labelId?: string
  invalid?: boolean
  /** Shown under the calendar — usually which timezone the clock refers to. */
  hint?: string
}

/**
 * The same picker with a time of day, for backdating an attempt.
 *
 * Date and time are edited separately because they fail differently: the day is
 * a choice from a calendar, the time is four digits. Bundling them into one
 * native `datetime-local` is what produces the `dd/mm/yyyy, --:-- --` mask.
 */
export function DateTimePicker({
  value,
  onChange,
  max,
  id,
  labelId,
  invalid,
  hint,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false)
  const [datePart = "", timePart = ""] = value.split("T")
  const [maxDate, maxTime] = (max ?? "").split("T")
  const selected = toCalendarDate(datePart)

  /* The time cap only applies on the last allowed day. */
  const timeCap = maxDate && datePart === maxDate ? maxTime : undefined

  const commit = (nextDate: string, nextTime: string) => {
    if (!nextDate) return onChange("")
    const time = nextTime || "12:00"
    /* Never emit a moment past the cap — the API rejects future attempts. */
    if (maxDate && (nextDate > maxDate || (nextDate === maxDate && maxTime && time > maxTime))) {
      return onChange(`${maxDate}T${maxTime}`)
    }
    onChange(`${nextDate}T${time}`)
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              id={id}
              type="button"
              variant="outline"
              aria-invalid={invalid || undefined}
              aria-labelledby={labelId && id ? `${labelId} ${id}` : undefined}
              className={cn(
                "flex-1 justify-start gap-2 font-normal",
                !datePart && "text-muted-foreground",
              )}
            />
          }
        >
          <CalendarIcon className="size-3.5 shrink-0" aria-hidden />
          {datePart ? formatLocalDate(datePart, "long") : "Pick a date"}
        </PopoverTrigger>

        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            autoFocus
            selected={selected}
            defaultMonth={selected ?? (maxDate ? toCalendarDate(maxDate) : undefined)}
            endMonth={maxDate ? toCalendarDate(maxDate) : undefined}
            disabled={maxDate ? { after: toCalendarDate(maxDate) as Date } : undefined}
            onSelect={(date) => {
              if (!date) return
              commit(toLocalDate(date), timePart)
              setOpen(false)
            }}
          />
          {hint ? (
            <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
              {hint}
            </p>
          ) : null}
        </PopoverContent>
      </Popover>

      <div className="relative sm:w-32">
        <ClockIcon
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type="time"
          aria-label="Time of day"
          value={timePart}
          max={timeCap}
          disabled={!datePart}
          onChange={(event) => commit(datePart, event.target.value)}
          className={cn(
            "h-8 w-full rounded-lg border border-input bg-transparent py-1 pr-2 pl-8 text-sm tabular-nums outline-none transition-colors",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            "disabled:pointer-events-none disabled:opacity-50",
            "dark:bg-input/30 [&::-webkit-calendar-picker-indicator]:hidden",
          )}
        />
      </div>
    </div>
  )
}
