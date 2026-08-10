import { formatInTimeZone, toZonedTime } from "date-fns-tz"

import type { Instant, LocalDate } from "@/lib/api/types"

/**
 * Date handling for ReSolve.
 *
 * The API speaks two date shapes and they are not interchangeable:
 *
 * - `LocalDate` (`yyyy-MM-dd`) — a calendar day in the *owner's* timezone.
 *   Fields ending in `Date`. Never pass one through `new Date()` for locale
 *   formatting: that parses as UTC midnight and renders as the previous day for
 *   anyone west of UTC.
 * - `Instant` (ISO 8601 UTC) — a point in time. Fields ending in `At`. Always
 *   formatted against the timezone the API reported, never the browser's.
 *
 * Everything in this module is pure string work or timezone-explicit, so it is
 * safe in both Server and Client Components.
 */

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const

const MONTHS_SHORT = MONTHS.map((month) => month.slice(0, 3))

const DAY_MS = 24 * 60 * 60 * 1000

type LocalDateParts = { year: number; month: number; day: number }

/** Splits `yyyy-MM-dd` without going anywhere near `Date`. Null if malformed. */
export function parseLocalDate(value: LocalDate): LocalDateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  }
}

export type LocalDateStyle = "long" | "medium" | "short" | "dayMonth"

/**
 * Renders a `LocalDate` for display. Purely lexical — the string is split, not
 * parsed, so the rendered day is always the day the API meant.
 */
export function formatLocalDate(
  value: LocalDate | null | undefined,
  style: LocalDateStyle = "medium",
): string {
  if (!value) return "—"
  const parts = parseLocalDate(value)
  if (!parts) return value

  const { year, month, day } = parts
  const monthIndex = month - 1

  switch (style) {
    case "long":
      return `${day} ${MONTHS[monthIndex] ?? month} ${year}`
    case "short":
      return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`
    case "dayMonth":
      return `${day} ${MONTHS_SHORT[monthIndex] ?? month}`
    case "medium":
    default:
      return `${day} ${MONTHS_SHORT[monthIndex] ?? month} ${year}`
  }
}

/** The weekday name for a `LocalDate`, computed in UTC so no zone can shift it. */
export function localDateWeekday(
  value: LocalDate,
  style: "long" | "short" = "short",
): string {
  const parts = parseLocalDate(value)
  if (!parts) return ""
  const utc = Date.UTC(parts.year, parts.month - 1, parts.day)
  return new Intl.DateTimeFormat("en-GB", {
    weekday: style,
    timeZone: "UTC",
  }).format(utc)
}

/**
 * Formats an instant in the owner's timezone.
 *
 * `timezone` is the IANA identifier the API reported on the dashboard,
 * insights, reminder, or settings response — never
 * `Intl.DateTimeFormat().resolvedOptions().timeZone`.
 */
export function formatInstant(
  value: Instant | null | undefined,
  timezone: string,
  pattern = "d MMM yyyy, HH:mm",
): string {
  if (!value) return "—"
  try {
    return formatInTimeZone(new Date(value), timezone, pattern)
  } catch {
    return value
  }
}

/** The date part of an instant, as a `LocalDate` in the given timezone. */
export function instantToLocalDate(
  value: Instant,
  timezone: string,
): LocalDate | null {
  try {
    return formatInTimeZone(new Date(value), timezone, "yyyy-MM-dd")
  } catch {
    return null
  }
}

/**
 * Compares two `LocalDate`s. They are ISO-ordered, so string comparison is
 * correct and no parsing is needed.
 */
export function compareLocalDate(a: LocalDate, b: LocalDate): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/** Today as a `LocalDate` in the given timezone. */
export function todayInZone(timezone: string): LocalDate {
  try {
    return formatInTimeZone(new Date(), timezone, "yyyy-MM-dd")
  } catch {
    return formatInTimeZone(new Date(), "UTC", "yyyy-MM-dd")
  }
}

/** The current `HH:mm` in the given timezone, zero-padded. */
export function timeInZone(timezone: string): string {
  try {
    return formatInTimeZone(new Date(), timezone, "HH:mm")
  } catch {
    return formatInTimeZone(new Date(), "UTC", "HH:mm")
  }
}

/** Shifts a `LocalDate` by whole days, staying in calendar-day arithmetic. */
export function addLocalDays(value: LocalDate, days: number): LocalDate {
  const parts = parseLocalDate(value)
  if (!parts) return value
  const shifted = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day) + days * DAY_MS,
  )
  return shifted.toISOString().slice(0, 10)
}

/** Whole days between two `LocalDate`s (`to - from`). */
export function localDaysBetween(from: LocalDate, to: LocalDate): number {
  const a = parseLocalDate(from)
  const b = parseLocalDate(to)
  if (!a || !b) return 0
  return Math.round(
    (Date.UTC(b.year, b.month - 1, b.day) -
      Date.UTC(a.year, a.month - 1, a.day)) /
      DAY_MS,
  )
}

/**
 * Human copy for how due something is.
 *
 * Consumes the server's `daysOverdue` rather than computing it — the backend
 * has already resolved this against the owner's timezone, and subtracting
 * instants client-side is how off-by-one-day bugs get in.
 */
export function relativeDueLabel(daysOverdue: number): string {
  if (daysOverdue <= 0) return "Due today"
  if (daysOverdue === 1) return "1 day overdue"
  return `${daysOverdue} days overdue`
}

/**
 * Human copy for a scheduled date, derived by comparing `LocalDate` strings
 * against the owner's today — never by subtracting instants.
 */
export function relativeScheduledLabel(
  dueDate: LocalDate,
  today: LocalDate,
): string {
  const delta = localDaysBetween(today, dueDate)
  if (delta === 0) return "Due today"
  if (delta === 1) return "Due tomorrow"
  if (delta > 1) return `Due in ${delta} days`
  return relativeDueLabel(-delta)
}

/** An `<input type="date">`-ready value. `LocalDate` is already that format. */
export function toDateInputValue(value: LocalDate | null | undefined): string {
  return value ?? ""
}

/**
 * Now as a value for `<input type="datetime-local">`, in the owner's timezone
 * so "no future attempts" means the owner's clock, not the browser's.
 */
export function nowForDateTimeInput(timezone: string): string {
  try {
    return formatInTimeZone(new Date(), timezone, "yyyy-MM-dd'T'HH:mm")
  } catch {
    return formatInTimeZone(new Date(), "UTC", "yyyy-MM-dd'T'HH:mm")
  }
}

/**
 * Converts a `datetime-local` value entered in the owner's timezone into the
 * ISO instant the API expects for `attemptedAt`.
 */
export function dateTimeInputToInstant(
  value: string,
  timezone: string,
): Instant | null {
  if (!value) return null
  // Interpret the wall-clock value as being in `timezone`: format "now" in that
  // zone to discover its offset at that moment, then apply it.
  try {
    const offset = formatInTimeZone(new Date(`${value}:00Z`), timezone, "xxx")
    return new Date(`${value}:00${offset}`).toISOString()
  } catch {
    return new Date(value).toISOString()
  }
}

/** Re-exported for the rare case a caller needs a zoned `Date` object. */
export { toZonedTime }
