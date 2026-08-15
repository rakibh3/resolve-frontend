"use client"

import { useActionState, useId, useState } from "react"
import { AlertTriangleIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { DateTimePicker } from "@/components/ui/date-picker"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { AttemptOutcome } from "@/lib/api/types"
import { dateTimeInputToInstant, nowForDateTimeInput } from "@/lib/date"
import { LIMITS } from "@/lib/validation"
import { cn } from "@/lib/utils"

import { logAttempt, type AttemptState } from "../_actions/attempts"

/**
 * What each outcome does to the schedule. The engine owns the arithmetic; this
 * is the copy that tells the owner what they are about to trigger.
 */
const OUTCOMES: {
  value: AttemptOutcome
  label: string
  effect: string
}[] = [
  {
    value: "SOLVED_INDEPENDENTLY",
    label: "Solved on my own",
    effect: "Advances to the next stage.",
  },
  {
    value: "SOLVED_WITH_HINT",
    label: "Solved with a hint",
    effect: "Repeats the current stage.",
  },
  {
    value: "VIEWED_SOLUTION",
    label: "Viewed the solution",
    effect: "Resets the cycle to Day 0.",
  },
]

const CONFIDENCE_VALUES = [1, 2, 3, 4, 5] as const

const initialState: AttemptState = {}

export function AttemptForm({
  problemId,
  timezone,
  onLogged,
  compact = false,
}: {
  problemId: string
  /** The owner's timezone, so "no future attempts" means their clock. */
  timezone: string
  onLogged?: () => void
  compact?: boolean
}) {
  const [outcome, setOutcome] = useState<AttemptOutcome>("SOLVED_INDEPENDENTLY")
  const [notes, setNotes] = useState("")
  const [backdating, setBackdating] = useState(false)
  const [attemptedAt, setAttemptedAt] = useState("")
  const fieldId = useId()

  // Feedback is handled inside the reducer rather than in an effect watching
  // `state`: it runs in the same transition as the submission, so there is no
  // second render pass and no cascading state update.
  const [state, formAction, pending] = useActionState(
    async (previous: AttemptState, formData: FormData) => {
      const result = await logAttempt(problemId, previous, formData)
      if (result.ok && result.message) {
        toast.success(result.message)
        onLogged?.()
      } else if (result.message) {
        toast.error(result.message)
      }
      return result
    },
    initialState,
  )

  const notesTooLong = notes.length > LIMITS.notesMax

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <FieldGroup>
        <Field>
          <FieldTitle>Outcome</FieldTitle>
          <div
            role="radiogroup"
            aria-label="Outcome"
            className="grid gap-2 sm:grid-cols-3"
          >
            {OUTCOMES.map((option) => (
              <label
                key={option.value}
                className={cn(
                  "interactive-press flex cursor-pointer flex-col gap-1 rounded-none border-2 border-foreground p-3 text-left shadow-[var(--shadow-neo-sm)]",
                  "has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                  outcome === option.value
                    ? "border-primary/40 bg-primary/5"
                    : "border-border hover:bg-muted/50",
                )}
              >
                <input
                  type="radio"
                  name="outcome"
                  value={option.value}
                  checked={outcome === option.value}
                  onChange={() => setOutcome(option.value)}
                  className="sr-only"
                />
                <span className="text-sm font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground">
                  {option.effect}
                </span>
              </label>
            ))}
          </div>
        </Field>

        {outcome === "VIEWED_SOLUTION" && (
          <p
            role="status"
            className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/40 px-3 py-2 text-xs text-warning-foreground"
          >
            <AlertTriangleIcon className="mt-px size-3.5 shrink-0" aria-hidden />
            <span>
              This resets the revision cycle to Day 0 and permanently marks the
              problem as having had its solution viewed — that flag never clears.
            </span>
          </p>
        )}

        <div className={cn("grid gap-4", compact ? "" : "sm:grid-cols-2")}>
          <Field>
            <FieldLabel htmlFor={`${fieldId}-duration`}>
              Time spent (minutes)
            </FieldLabel>
            <Input
              id={`${fieldId}-duration`}
              name="durationMinutes"
              type="number"
              inputMode="numeric"
              required
              min={LIMITS.attemptDurationMin}
              max={LIMITS.attemptDurationMax}
              step={1}
              defaultValue={20}
              aria-invalid={
                state.fieldErrors?.durationMinutes ? true : undefined
              }
            />
            <FieldDescription>1–1440 minutes.</FieldDescription>
            {state.fieldErrors?.durationMinutes && (
              <FieldError>{state.fieldErrors.durationMinutes}</FieldError>
            )}
          </Field>

          <Field>
            <FieldTitle>Confidence</FieldTitle>
            <div
              role="radiogroup"
              aria-label="Confidence, 1 to 5"
              className="flex gap-1.5"
            >
              {CONFIDENCE_VALUES.map((value) => (
                <label
                  key={value}
                  className="flex-1 cursor-pointer"
                  title={`Confidence ${value} of 5`}
                >
                  <input
                    type="radio"
                    name="confidence"
                    value={value}
                    defaultChecked={value === 3}
                    className="peer sr-only"
                  />
                  <span
                    className={cn(
                      "flex h-8 items-center justify-center rounded-lg border border-border text-sm tabular-nums transition-colors",
                      "peer-checked:border-primary/40 peer-checked:bg-primary/10 peer-checked:font-semibold",
                      "peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50",
                    )}
                  >
                    {value}
                  </span>
                </label>
              ))}
            </div>
            {state.fieldErrors?.confidence && (
              <FieldError>{state.fieldErrors.confidence}</FieldError>
            )}
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor={`${fieldId}-notes`}>Notes</FieldLabel>
          <Textarea
            id={`${fieldId}-notes`}
            name="notes"
            rows={compact ? 2 : 3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="What was the insight? What tripped you up?"
            aria-invalid={notesTooLong ? true : undefined}
          />
          <FieldDescription>
            <span className={cn(notesTooLong && "text-destructive")}>
              {notes.length.toLocaleString()} / {LIMITS.notesMax.toLocaleString()}
            </span>
            {" characters. Left empty, no note is stored."}
          </FieldDescription>
          {state.fieldErrors?.notes && (
            <FieldError>{state.fieldErrors.notes}</FieldError>
          )}
        </Field>

        <Field>
          <label className="flex w-fit cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={backdating}
              onChange={(event) => setBackdating(event.target.checked)}
              className="size-3.5 accent-[var(--primary)]"
            />
            I solved this earlier
          </label>

          {backdating && (
            <div className="animate-fade-in mt-2 flex flex-col gap-1.5">
              <FieldLabel
                id={`${fieldId}-attempted-at-label`}
                htmlFor={`${fieldId}-attempted-at`}
              >
                When
              </FieldLabel>
              <DateTimePicker
                id={`${fieldId}-attempted-at`}
                labelId={`${fieldId}-attempted-at-label`}
                value={attemptedAt}
                onChange={setAttemptedAt}
                max={nowForDateTimeInput(timezone)}
                invalid={Boolean(state.fieldErrors?.attemptedAt)}
              />
              {/* The wall-clock value is entered in the owner's timezone; the
                  API wants an instant, so the conversion happens here rather
                  than letting the server guess which zone it was typed in. */}
              <input
                type="hidden"
                name="attemptedAt"
                value={
                  attemptedAt
                    ? (dateTimeInputToInstant(attemptedAt, timezone) ?? "")
                    : ""
                }
              />
              <FieldDescription>
                Times are in {timezone}. Backdating out of order is fine — the
                schedule is replayed from the full attempt history, so the
                result matches logging in order.
              </FieldDescription>
              {state.fieldErrors?.attemptedAt && (
                <FieldError>{state.fieldErrors.attemptedAt}</FieldError>
              )}
            </div>
          )}
        </Field>
      </FieldGroup>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending || notesTooLong}>
          {pending ? "Logging…" : "Log attempt"}
        </Button>
        {state.ok && state.message ? (
          <p role="status" className="text-sm text-muted-foreground">
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  )
}
