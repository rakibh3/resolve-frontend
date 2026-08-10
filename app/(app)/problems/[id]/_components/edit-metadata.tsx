"use client"

import { useActionState, useState } from "react"
import { PencilIcon } from "lucide-react"
import { toast } from "sonner"

import { TopicsInput } from "@/app/(app)/problems/new/_components/topics-input"
import { DifficultyBadge } from "@/components/domain/difficulty-badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type {
  Difficulty,
  ProblemDetail,
  TopicWithCount,
} from "@/lib/api/types"
import { LIMITS } from "@/lib/validation"

import { updateProblem, type ProblemFormState } from "../actions"

const initialState: ProblemFormState = {}

export function EditMetadata({
  problem,
  suggestions,
}: {
  problem: ProblemDetail
  suggestions: TopicWithCount[]
}) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(
    async (previous: ProblemFormState, formData: FormData) => {
      const result = await updateProblem(problem.id, previous, formData)
      if (result.ok && result.message) {
        toast.success(result.message)
        setOpen(false)
      } else if (result.message) {
        toast.error(result.message)
      }
      return result
    },
    initialState,
  )

  // UNRATED is rejected for LeetCode problems, so it is not offered for them.
  const difficulties: Difficulty[] =
    problem.source === "LEETCODE"
      ? ["EASY", "MEDIUM", "HARD"]
      : ["EASY", "MEDIUM", "HARD", "UNRATED"]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <PencilIcon aria-hidden />
        Edit
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit problem</DialogTitle>
          <DialogDescription>
            Metadata only — this never touches attempts or the revision
            schedule.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-5">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="edit-title">Title</FieldLabel>
              <Input
                id="edit-title"
                name="title"
                defaultValue={problem.title}
                maxLength={LIMITS.titleMax}
                aria-invalid={state.fieldErrors?.title ? true : undefined}
              />
              {state.fieldErrors?.title && (
                <FieldError>{state.fieldErrors.title}</FieldError>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="edit-difficulty">Difficulty</FieldLabel>
              <div className="flex flex-wrap gap-1.5" id="edit-difficulty">
                {difficulties.map((value) => (
                  <label key={value} className="cursor-pointer">
                    <input
                      type="radio"
                      name="difficulty"
                      value={value}
                      defaultChecked={problem.difficulty === value}
                      className="peer sr-only"
                    />
                    <span className="block rounded-lg opacity-60 ring-offset-2 transition-opacity peer-checked:opacity-100 peer-focus-visible:ring-2 peer-focus-visible:ring-ring/50">
                      <DifficultyBadge difficulty={value} />
                    </span>
                  </label>
                ))}
              </div>
              {problem.source === "LEETCODE" && (
                <FieldDescription>
                  LeetCode problems cannot be Unrated.
                </FieldDescription>
              )}
              {state.fieldErrors?.difficulty && (
                <FieldError>{state.fieldErrors.difficulty}</FieldError>
              )}
            </Field>

            {/* Topics are replaced wholesale, so the flag tells the action the
                submitted list is authoritative. */}
            <input type="hidden" name="topicsEdited" value="1" />
            <TopicsInput
              suggestions={suggestions}
              defaultValue={problem.topics.map((topic) => topic.name)}
            />
            <p className="-mt-2 text-xs text-muted-foreground">
              This list replaces the problem&rsquo;s topics entirely — anything
              you remove here is unlinked.
            </p>

            {problem.canonicalUrl && (
              <Field>
                <FieldLabel htmlFor="edit-canonical">Canonical URL</FieldLabel>
                <Input
                  id="edit-canonical"
                  value={problem.canonicalUrl}
                  readOnly
                  disabled
                />
                <FieldDescription>
                  Immutable once a problem is captured.
                </FieldDescription>
              </Field>
            )}

            <Field>
              <FieldLabel htmlFor="edit-source-name">
                Where it&rsquo;s from
              </FieldLabel>
              <Input
                id="edit-source-name"
                name="sourceName"
                defaultValue={problem.sourceName ?? ""}
                maxLength={LIMITS.sourceNameMax}
              />
              <FieldDescription>Clearing this removes it.</FieldDescription>
              {state.fieldErrors?.sourceName && (
                <FieldError>{state.fieldErrors.sourceName}</FieldError>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="edit-source-url">Link</FieldLabel>
              <Input
                id="edit-source-url"
                name="sourceUrl"
                type="url"
                defaultValue={problem.sourceUrl ?? ""}
              />
              {state.fieldErrors?.sourceUrl && (
                <FieldError>{state.fieldErrors.sourceUrl}</FieldError>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="edit-statement">Statement</FieldLabel>
              <Textarea
                id="edit-statement"
                name="statement"
                rows={4}
                defaultValue={problem.statement ?? ""}
                maxLength={LIMITS.statementMax}
              />
              {state.fieldErrors?.statement && (
                <FieldError>{state.fieldErrors.statement}</FieldError>
              )}
            </Field>
          </FieldGroup>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
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
