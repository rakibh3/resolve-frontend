"use client"

import { useActionState, useMemo, useState } from "react"
import { PencilIcon, TriangleAlertIcon } from "lucide-react"
import { toast } from "sonner"

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
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { PatternWithCount } from "@/lib/api/types"
import { LIMITS, slugifyName } from "@/lib/validation"

import { renamePattern, type RenamePatternState } from "../actions"

const initialState: RenamePatternState = {}

/**
 * Rename, and — on a slug collision — merge.
 *
 * Merging is the reason this dialog exists. Patterns are typed by hand into
 * recall cards, so `two-pointer` and `two-pointers` both get invented and only
 * a rename can collapse them. The collision is detected as the owner types so
 * the destructive outcome is a decision, not a surprise.
 */
export function RenamePattern({
  pattern,
  allPatterns,
}: {
  pattern: PatternWithCount
  allPatterns: PatternWithCount[]
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(pattern.name)
  const [state, formAction, pending] = useActionState(
    async (previous: RenamePatternState, formData: FormData) => {
      const result = await renamePattern(pattern.id, previous, formData)
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

  const trimmed = name.trim()
  const slug = slugifyName(trimmed)

  const collision = useMemo(
    () =>
      allPatterns.find(
        (other) => other.slug === slug && other.id !== pattern.id,
      ),
    [allPatterns, slug, pattern.id],
  )

  const unslugifiable = trimmed.length > 0 && slug.length === 0
  const tooLong = trimmed.length > LIMITS.patternNameMax
  const blocked = trimmed.length === 0 || unslugifiable || tooLong

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label={`Rename ${pattern.name}`}
          />
        }
      >
        <PencilIcon aria-hidden />
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename “{pattern.name}”</DialogTitle>
          <DialogDescription>
            Pattern names normalize to a slug, so renaming onto an existing name
            merges the two patterns. This is how near-duplicates get collapsed.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor={`rename-pattern-${pattern.id}`}>
              Name
            </FieldLabel>
            <Input
              id={`rename-pattern-${pattern.id}`}
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={LIMITS.patternNameMax + 20}
              required
              aria-invalid={
                blocked || state.fieldErrors?.name ? true : undefined
              }
            />
            <FieldDescription>
              Slug: <code>{slug || "—"}</code>
            </FieldDescription>
            {unslugifiable && (
              <FieldError>
                That name has no letters or numbers to build a slug from.
              </FieldError>
            )}
            {tooLong && (
              <FieldError>
                Keep it under {LIMITS.patternNameMax} characters.
              </FieldError>
            )}
            {state.fieldErrors?.name && (
              <FieldError>{state.fieldErrors.name}</FieldError>
            )}
          </Field>

          {collision && (
            <p
              role="status"
              className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/40 px-3 py-2 text-sm text-warning-foreground"
            >
              <TriangleAlertIcon
                className="mt-0.5 size-4 shrink-0"
                aria-hidden
              />
              <span>
                This will{" "}
                <strong>
                  merge “{pattern.name}” into “{collision.name}”
                </strong>
                . All {pattern.problemCount} card{" "}
                {pattern.problemCount === 1 ? "link" : "links"} move across and
                “{pattern.name}” is deleted. This cannot be undone.
              </span>
            </p>
          )}

          {state.message && !state.ok && (
            <p role="alert" className="text-sm text-destructive">
              {state.message}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || blocked}>
              {pending ? "Saving…" : collision ? "Merge patterns" : "Rename"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
