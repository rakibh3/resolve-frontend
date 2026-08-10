"use client"

import { useActionState, useState, useTransition } from "react"
import { PencilIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import {
  deleteAttempt,
  updateAttempt,
  type AttemptState,
} from "@/app/(app)/_actions/attempts"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { Attempt, AttemptOutcome } from "@/lib/api/types"
import { LIMITS } from "@/lib/validation"

const OUTCOMES: { value: AttemptOutcome; label: string }[] = [
  { value: "SOLVED_INDEPENDENTLY", label: "Solved independently" },
  { value: "SOLVED_WITH_HINT", label: "Solved with a hint" },
  { value: "VIEWED_SOLUTION", label: "Viewed the solution" },
]

const initialState: AttemptState = {}

export function AttemptRowActions({
  problemId,
  attempt,
  timezone,
}: {
  problemId: string
  attempt: Attempt
  timezone: string
}) {
  const [editing, setEditing] = useState(false)
  const [deleting, startDelete] = useTransition()

  return (
    <div className="flex items-center gap-1">
      <Button
        size="icon-xs"
        variant="ghost"
        aria-label="Edit this attempt"
        onClick={() => setEditing(true)}
      >
        <PencilIcon aria-hidden />
      </Button>

      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button
              size="icon-xs"
              variant="ghost"
              aria-label="Delete this attempt"
              disabled={deleting}
            />
          }
        >
          <Trash2Icon aria-hidden />
        </AlertDialogTrigger>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this attempt?</AlertDialogTitle>
            <AlertDialogDescription>
              The problem&rsquo;s schedule will be replayed from its remaining
              attempts, which can move the current stage and due date. If this
              is the only attempt, the revision cycle is removed entirely.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                startDelete(async () => {
                  const result = await deleteAttempt(problemId, attempt.id)
                  if (result.ok) toast.success(result.message)
                  else toast.error(result.message ?? "Could not delete.")
                })
              }
            >
              Delete attempt
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditAttemptDialog
        open={editing}
        onOpenChange={setEditing}
        problemId={problemId}
        attempt={attempt}
        timezone={timezone}
      />
    </div>
  )
}

function EditAttemptDialog({
  open,
  onOpenChange,
  problemId,
  attempt,
  timezone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  problemId: string
  attempt: Attempt
  timezone: string
}) {
  const [state, formAction, pending] = useActionState(
    async (previous: AttemptState, formData: FormData) => {
      const result = await updateAttempt(
        problemId,
        attempt.id,
        previous,
        formData,
      )
      if (result.ok && result.message) {
        // The schedule may have moved even though only an old attempt changed
        // — the message carries whatever the replay produced.
        toast.success(result.message)
        onOpenChange(false)
      } else if (result.message) {
        toast.error(result.message)
      }
      return result
    },
    initialState,
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit attempt</DialogTitle>
          <DialogDescription>
            Editing an attempt replays the whole schedule, so the current stage
            and due date may move — even for an attempt this old.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="edit-outcome">Outcome</FieldLabel>
            <select
              id="edit-outcome"
              name="outcome"
              defaultValue={attempt.outcome}
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none dark:bg-input/30"
            >
              {OUTCOMES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="edit-duration">Minutes</FieldLabel>
              <Input
                id="edit-duration"
                name="durationMinutes"
                type="number"
                min={LIMITS.attemptDurationMin}
                max={LIMITS.attemptDurationMax}
                defaultValue={attempt.durationMinutes}
              />
              {state.fieldErrors?.durationMinutes && (
                <FieldError>{state.fieldErrors.durationMinutes}</FieldError>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="edit-confidence">Confidence</FieldLabel>
              <Input
                id="edit-confidence"
                name="confidence"
                type="number"
                min={LIMITS.confidenceMin}
                max={LIMITS.confidenceMax}
                defaultValue={attempt.confidence}
              />
              {state.fieldErrors?.confidence && (
                <FieldError>{state.fieldErrors.confidence}</FieldError>
              )}
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="edit-notes">Notes</FieldLabel>
            <Textarea
              id="edit-notes"
              name="notes"
              rows={3}
              defaultValue={attempt.notes ?? ""}
              maxLength={LIMITS.notesMax}
            />
            <FieldDescription>
              Logged {new Intl.DateTimeFormat("en-GB", {
                timeZone: timezone,
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(attempt.attemptedAt))}
              .
            </FieldDescription>
          </Field>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
