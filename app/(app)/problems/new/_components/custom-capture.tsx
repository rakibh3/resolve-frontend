"use client"

import { useActionState, useState } from "react"

import { DifficultyBadge } from "@/components/domain/difficulty-badge"
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
import type { Difficulty, TopicWithCount } from "@/lib/api/types"
import { LIMITS } from "@/lib/validation"
import { cn } from "@/lib/utils"

import { captureProblem, type CaptureState } from "../actions"
import { TopicsInput } from "./topics-input"

/** Custom problems may be any difficulty, including UNRATED — the default. */
const DIFFICULTIES: Difficulty[] = ["EASY", "MEDIUM", "HARD", "UNRATED"]

const initialState: CaptureState = {}

export function CustomCapture({
  suggestions,
}: {
  suggestions: TopicWithCount[]
}) {
  const [state, formAction, pending] = useActionState(
    captureProblem,
    initialState,
  )
  const [statement, setStatement] = useState("")

  const statementTooLong = statement.length > LIMITS.statementMax

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="source" value="CUSTOM" />

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="custom-title">Title</FieldLabel>
          <Input
            id="custom-title"
            name="title"
            required
            maxLength={LIMITS.titleMax}
            placeholder="Rotate a matrix in place"
            aria-invalid={state.fieldErrors?.title ? true : undefined}
          />
          <FieldDescription>
            Up to {LIMITS.titleMax} characters.
          </FieldDescription>
          {state.fieldErrors?.title && (
            <FieldError>{state.fieldErrors.title}</FieldError>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="custom-difficulty">Difficulty</FieldLabel>
          <div className="flex flex-wrap gap-1.5" id="custom-difficulty">
            {DIFFICULTIES.map((value) => (
              <label key={value} className="cursor-pointer">
                <input
                  type="radio"
                  name="difficulty"
                  value={value}
                  defaultChecked={value === "UNRATED"}
                  className="peer sr-only"
                />
                <span className="block rounded-lg opacity-60 ring-offset-2 transition-opacity peer-checked:opacity-100 peer-focus-visible:ring-2 peer-focus-visible:ring-ring/50">
                  <DifficultyBadge difficulty={value} />
                </span>
              </label>
            ))}
          </div>
          <FieldDescription>
            Defaults to Unrated — you can rate it after your first attempt.
          </FieldDescription>
        </Field>

        <TopicsInput suggestions={suggestions} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="custom-source-name">Where it&rsquo;s from</FieldLabel>
            <Input
              id="custom-source-name"
              name="sourceName"
              maxLength={LIMITS.sourceNameMax}
              placeholder="Cracking the Coding Interview, ch. 4"
              aria-invalid={state.fieldErrors?.sourceName ? true : undefined}
            />
            {state.fieldErrors?.sourceName && (
              <FieldError>{state.fieldErrors.sourceName}</FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="custom-source-url">Link</FieldLabel>
            <Input
              id="custom-source-url"
              name="sourceUrl"
              type="url"
              inputMode="url"
              placeholder="https://…"
              aria-invalid={state.fieldErrors?.sourceUrl ? true : undefined}
            />
            <FieldDescription>
              A full http(s) URL, or leave it blank.
            </FieldDescription>
            {state.fieldErrors?.sourceUrl && (
              <FieldError>{state.fieldErrors.sourceUrl}</FieldError>
            )}
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="custom-statement">Statement</FieldLabel>
          <Textarea
            id="custom-statement"
            name="statement"
            rows={5}
            value={statement}
            onChange={(event) => setStatement(event.target.value)}
            placeholder="Paste or summarize the problem so you can revise without the original to hand."
            aria-invalid={statementTooLong ? true : undefined}
          />
          <FieldDescription>
            <span className={cn(statementTooLong && "text-destructive")}>
              {statement.length.toLocaleString()} /{" "}
              {LIMITS.statementMax.toLocaleString()}
            </span>{" "}
            characters.
          </FieldDescription>
          {state.fieldErrors?.statement && (
            <FieldError>{state.fieldErrors.statement}</FieldError>
          )}
        </Field>
      </FieldGroup>

      {state.message && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}

      <div>
        <Button type="submit" disabled={pending || statementTooLong}>
          {pending ? "Capturing…" : "Capture problem"}
        </Button>
      </div>
    </form>
  )
}
