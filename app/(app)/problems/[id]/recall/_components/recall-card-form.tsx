"use client"

import { useActionState, useState } from "react"
import { useRouter } from "next/navigation"
import { InfoIcon, TriangleAlertIcon } from "lucide-react"
import { toast } from "sonner"

import { VocabularyInput } from "@/components/domain/vocabulary-input"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { EmbeddedRecallCard, PatternWithCount } from "@/lib/api/types"
import { LIMITS } from "@/lib/validation"
import { cn } from "@/lib/utils"

import { saveRecallCard, type RecallCardState } from "../actions"
import { DeleteRecallCard } from "./delete-recall-card"

const initialState: RecallCardState = {}

/**
 * The card editor.
 *
 * Every field is on screen and pre-filled at all times, including the ones the
 * owner is not editing. That is not a layout preference — the endpoint is a
 * `PUT` that stores an omitted field as empty, so a form that showed only the
 * field being changed would silently wipe the rest of the card and all of the
 * problem's patterns on save.
 */
export function RecallCardForm({
  problemId,
  problemTitle,
  card,
  patterns,
  suggestions,
  needsRecallUpdate,
}: {
  problemId: string
  problemTitle: string
  card: EmbeddedRecallCard | null
  /** Current pattern display names — patterns live on the problem, not the card. */
  patterns: string[]
  suggestions: PatternWithCount[]
  needsRecallUpdate: boolean
}) {
  const router = useRouter()
  const [keyInsight, setKeyInsight] = useState(card?.keyInsight ?? "")
  const [state, formAction, pending] = useActionState(
    async (previous: RecallCardState, formData: FormData) => {
      const result = await saveRecallCard(problemId, previous, formData)
      if (result.ok && result.message) {
        toast.success(result.message)
        router.push(`/problems/${problemId}`)
      } else if (result.message) {
        toast.error(result.message)
      }
      return result
    },
    initialState,
  )

  const insightLength = keyInsight.trim().length
  const overLimit = insightLength > LIMITS.keyInsightMax

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {needsRecallUpdate && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-lg border border-state-overdue-foreground/30 bg-state-overdue/40 px-3 py-2 text-sm text-state-overdue-foreground"
        >
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            You viewed a solution after writing this card, so it is missing
            whatever you had to look up. Saving clears the flag — even if you
            change nothing, because the timestamp moves.
          </span>
        </p>
      )}

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="keyInsight">
            Key insight <span aria-hidden>*</span>
          </FieldLabel>
          <Textarea
            id="keyInsight"
            name="keyInsight"
            rows={3}
            required
            value={keyInsight}
            onChange={(event) => setKeyInsight(event.target.value)}
            placeholder="The one sentence that unlocks this problem six months from now"
            aria-invalid={
              overLimit || state.fieldErrors?.keyInsight ? true : undefined
            }
            aria-describedby="keyInsight-hint"
          />
          <FieldDescription id="keyInsight-hint">
            <span className="flex flex-wrap items-center justify-between gap-2">
              <span>
                The single line you reread before an interview. Everything else
                on this card is optional.
              </span>
              <span
                className={cn(
                  "tabular-nums",
                  overLimit && "font-medium text-destructive",
                )}
              >
                {insightLength}/{LIMITS.keyInsightMax}
              </span>
            </span>
          </FieldDescription>
          {overLimit && (
            <FieldError>
              Trim it to {LIMITS.keyInsightMax} characters — the length limit is
              the point of the field.
            </FieldError>
          )}
          {state.fieldErrors?.keyInsight && (
            <FieldError>{state.fieldErrors.keyInsight}</FieldError>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="approach">Approach</FieldLabel>
          <Textarea
            id="approach"
            name="approach"
            rows={5}
            defaultValue={card?.approach ?? ""}
            maxLength={LIMITS.approachMax}
            placeholder="How the solution actually goes, in enough detail to rebuild it"
            aria-invalid={state.fieldErrors?.approach ? true : undefined}
          />
          {state.fieldErrors?.approach && (
            <FieldError>{state.fieldErrors.approach}</FieldError>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="pitfalls">Pitfalls</FieldLabel>
          <Textarea
            id="pitfalls"
            name="pitfalls"
            rows={3}
            defaultValue={card?.pitfalls ?? ""}
            maxLength={LIMITS.pitfallsMax}
            placeholder="What you got wrong the first time, and what you will get wrong again"
            aria-invalid={state.fieldErrors?.pitfalls ? true : undefined}
          />
          {state.fieldErrors?.pitfalls && (
            <FieldError>{state.fieldErrors.pitfalls}</FieldError>
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="timeComplexity">Time complexity</FieldLabel>
            <Input
              id="timeComplexity"
              name="timeComplexity"
              defaultValue={card?.timeComplexity ?? ""}
              maxLength={LIMITS.complexityMax}
              placeholder="O(n log n)"
              // Free text on the backend — no notation is enforced.
              aria-invalid={
                state.fieldErrors?.timeComplexity ? true : undefined
              }
            />
            {state.fieldErrors?.timeComplexity && (
              <FieldError>{state.fieldErrors.timeComplexity}</FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="spaceComplexity">Space complexity</FieldLabel>
            <Input
              id="spaceComplexity"
              name="spaceComplexity"
              defaultValue={card?.spaceComplexity ?? ""}
              maxLength={LIMITS.complexityMax}
              placeholder="O(1)"
              aria-invalid={
                state.fieldErrors?.spaceComplexity ? true : undefined
              }
            />
            {state.fieldErrors?.spaceComplexity && (
              <FieldError>{state.fieldErrors.spaceComplexity}</FieldError>
            )}
          </Field>
        </div>

        <VocabularyInput
          name="patterns"
          label="Patterns"
          suggestions={suggestions}
          defaultValue={patterns}
          maxLength={LIMITS.patternNameMax}
          placeholder="Pick one below, or type a new technique"
          description={`How you solve it, not what it is about — “Monotonic Stack”, not “Array”. Up to ${LIMITS.patternNameMax} characters each.`}
          hint={
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <InfoIcon className="mt-px size-3 shrink-0" aria-hidden />
              This is the only place patterns can be assigned, and this list
              replaces the problem&rsquo;s patterns entirely.
            </p>
          }
        />
      </FieldGroup>

      {state.message && !state.ok && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
        {card && (
          <DeleteRecallCard
            problemId={problemId}
            problemTitle={problemTitle}
            patternCount={patterns.length}
          />
        )}
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push(`/problems/${problemId}`)}
          className="sm:ml-auto"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={pending || insightLength === 0 || overLimit}
        >
          {pending ? "Saving…" : card ? "Replace card" : "Write card"}
        </Button>
      </div>
    </form>
  )
}
