"use client"

import { useActionState, useState, useTransition } from "react"
import Link from "next/link"
import { ArrowRightIcon, SearchIcon, TriangleAlertIcon } from "lucide-react"

import { DifficultyBadge } from "@/components/domain/difficulty-badge"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { Difficulty, TopicWithCount } from "@/lib/api/types"

import {
  captureProblem,
  previewProblem,
  type CaptureState,
  type PreviewResult,
} from "../actions"
import { TopicsInput } from "./topics-input"

/** UNRATED is rejected for LeetCode problems, so it is never offered here. */
const RATED_DIFFICULTIES: Difficulty[] = ["EASY", "MEDIUM", "HARD"]

const initialState: CaptureState = {}

/**
 * The LeetCode capture path: paste a URL, confirm what the API resolved, then
 * capture. An explicit component rather than a `mode` flag on a shared form —
 * the two paths share fields but not flow.
 */
export function LeetcodeCapture({
  suggestions,
}: {
  suggestions: TopicWithCount[]
}) {
  const [state, formAction, capturing] = useActionState(
    captureProblem,
    initialState,
  )
  const [url, setUrl] = useState("")
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [previewing, startPreview] = useTransition()

  const runPreview = () => {
    if (!url.trim()) return
    startPreview(async () => setPreview(await previewProblem(url.trim())))
  }

  // A 422 anywhere in the flow switches to manual entry, pre-filled with the
  // canonical URL the API echoed back.
  const manual =
    state.needsManual || preview?.status === "manual"
      ? {
          canonicalUrl:
            state.canonicalUrl ??
            (preview?.status === "manual" ? preview.canonicalUrl : undefined) ??
            url,
          message:
            state.message ??
            (preview?.status === "manual" ? preview.message : ""),
        }
      : null

  const resolved =
    preview?.status === "resolved" || preview?.status === "exists"
      ? preview.preview
      : null

  return (
    <div className="flex flex-col gap-5">
      <Field>
        <FieldLabel htmlFor="leetcode-url">LeetCode URL</FieldLabel>
        <div className="flex gap-2">
          <Input
            id="leetcode-url"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value)
              setPreview(null)
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                runPreview()
              }
            }}
            placeholder="https://leetcode.com/problems/two-sum/"
            inputMode="url"
            aria-invalid={preview?.status === "invalid" ? true : undefined}
          />
          <Button
            type="button"
            variant="outline"
            onClick={runPreview}
            disabled={previewing || !url.trim()}
          >
            <SearchIcon aria-hidden />
            {previewing ? "Looking up…" : "Look up"}
          </Button>
        </div>
        <FieldDescription>
          Query strings, <code>/description</code>, <code>/solutions</code>, and
          a <code>www.</code> host are all fine — the URL is canonicalized.
        </FieldDescription>
        {preview?.status === "invalid" && (
          <FieldError>{preview.message}</FieldError>
        )}
      </Field>

      {preview?.status === "exists" && preview.preview.existingProblemId && (
        <div className="animate-fade-in-up flex flex-col items-start gap-3 rounded-xl border border-border bg-muted/40 p-4">
          <div className="flex flex-col gap-1">
            <strong className="text-sm font-semibold">
              Already in your library
            </strong>
            <p className="text-sm text-muted-foreground">
              {preview.preview.title} was captured before. Capturing again
              creates nothing.
            </p>
          </div>
          <Button
            render={
              <Link
                href={`/problems/${preview.preview.existingProblemId}`}
                transitionTypes={["nav-forward"]}
              />
            }
          >
            Open it
            <ArrowRightIcon aria-hidden />
          </Button>
        </div>
      )}

      {manual && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/40 px-3 py-2 text-sm text-warning-foreground"
        >
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            {manual.message ||
              "LeetCode metadata could not be resolved."}{" "}
            Enter the title and difficulty yourself and the problem will be
            captured with them.
          </span>
        </p>
      )}

      {(resolved || manual) && preview?.status !== "exists" && (
        <form
          action={formAction}
          className="animate-fade-in-up flex flex-col gap-5 rounded-xl border border-border bg-card p-4"
        >
          <input type="hidden" name="source" value="LEETCODE" />
          <input
            type="hidden"
            name="url"
            value={resolved?.canonicalUrl ?? manual?.canonicalUrl ?? url}
          />

          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">
              Canonical URL
            </span>
            <code className="truncate text-sm">
              {resolved?.canonicalUrl ?? manual?.canonicalUrl ?? url}
            </code>
          </div>

          <Field>
            <FieldLabel htmlFor="capture-title">Title</FieldLabel>
            <Input
              id="capture-title"
              name="title"
              required={Boolean(manual)}
              maxLength={300}
              defaultValue={resolved?.title ?? ""}
              aria-invalid={state.fieldErrors?.title ? true : undefined}
            />
            {state.fieldErrors?.title && (
              <FieldError>{state.fieldErrors.title}</FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="capture-difficulty">Difficulty</FieldLabel>
            <div className="flex gap-1.5">
              {RATED_DIFFICULTIES.map((value) => (
                <label key={value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="difficulty"
                    value={value}
                    defaultChecked={
                      resolved
                        ? resolved.difficulty === value
                        : value === "MEDIUM"
                    }
                    className="peer sr-only"
                    required={Boolean(manual)}
                  />
                  <span className="block rounded-lg opacity-60 ring-offset-2 transition-opacity peer-checked:opacity-100 peer-focus-visible:ring-2 peer-focus-visible:ring-ring/50">
                    <DifficultyBadge difficulty={value} />
                  </span>
                </label>
              ))}
            </div>
            <FieldDescription>
              LeetCode problems must have a rated difficulty — “Unrated” is only
              available for custom problems.
            </FieldDescription>
            {state.fieldErrors?.difficulty && (
              <FieldError>{state.fieldErrors.difficulty}</FieldError>
            )}
          </Field>

          <TopicsInput
            suggestions={suggestions}
            defaultValue={resolved?.topics ?? []}
          />

          {state.message && !manual && (
            <p role="alert" className="text-sm text-destructive">
              {state.message}
            </p>
          )}

          <div>
            <Button type="submit" disabled={capturing}>
              {capturing ? "Capturing…" : "Capture problem"}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
