"use client"

import { useActionState, useState } from "react"
import { CalendarClockIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { DatePicker } from "@/components/ui/date-picker"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { LocalDate } from "@/lib/api/types"
import { LIMITS } from "@/lib/validation"

import { rescheduleRevision, type ProblemFormState } from "../actions"

const initialState: ProblemFormState = {}

/**
 * Moves the current stage's due date.
 *
 * Only rendered when there is a cycle and it is not mastered — the backend
 * rejects both cases, so the control is hidden rather than shown and refused.
 */
export function RescheduleForm({
  problemId,
  today,
  currentDueDate,
}: {
  problemId: string
  /** The owner's local today, from the API — not the browser's clock. */
  today: LocalDate
  currentDueDate: LocalDate | null
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  /* An overdue problem's current due date is in the past, and the backend
     refuses anything earlier than today — so start from today rather than
     pre-filling a value that can only be rejected. */
  const [dueDate, setDueDate] = useState<LocalDate>(
    currentDueDate && currentDueDate >= today ? currentDueDate : today,
  )
  const [state, formAction, pending] = useActionState(
    async (previous: ProblemFormState, formData: FormData) => {
      const result = await rescheduleRevision(problemId, previous, formData)
      if (result.ok && result.message) {
        toast.success(result.message)
        setOpen(false)
        setReason("")
      }
      return result
    },
    initialState,
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="outline" size="sm" />}>
        <CalendarClockIcon aria-hidden />
        Reschedule
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80">
        <form action={formAction} className="flex flex-col gap-4">
          <Field>
            <FieldLabel id="reschedule-date-label" htmlFor="reschedule-date">
              New date
            </FieldLabel>
            {/* The yyyy-MM-dd value is sent verbatim — converting it to an
                instant would reinterpret the day in the wrong timezone. */}
            <DatePicker
              id="reschedule-date"
              labelId="reschedule-date-label"
              name="dueDate"
              value={dueDate}
              onChange={setDueDate}
              min={today}
              invalid={Boolean(state.fieldErrors?.dueDate)}
            />
            <FieldDescription>
              Cannot be earlier than today ({today}) in your timezone.
            </FieldDescription>
            {state.fieldErrors?.dueDate && (
              <FieldError>{state.fieldErrors.dueDate}</FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="reschedule-reason">Reason</FieldLabel>
            <Input
              id="reschedule-reason"
              name="reason"
              required
              maxLength={LIMITS.rescheduleReasonMax}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Travelling until Friday"
              aria-invalid={state.fieldErrors?.reason ? true : undefined}
            />
            <FieldDescription>
              Required — a reschedule is recorded in the revision history.
            </FieldDescription>
            {state.fieldErrors?.reason && (
              <FieldError>{state.fieldErrors.reason}</FieldError>
            )}
          </Field>

          {state.message && !state.ok && (
            <p role="alert" className="text-sm text-destructive">
              {state.message}
            </p>
          )}

          <Button type="submit" disabled={pending || !reason.trim()}>
            {pending ? "Moving…" : "Move this revision"}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  )
}
