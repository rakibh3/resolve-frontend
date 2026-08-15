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
import type { TopicWithCount } from "@/lib/api/types"
import { LIMITS, slugifyName } from "@/lib/validation"

import { renameTopic, type RenameTopicState } from "../actions"

const initialState: RenameTopicState = {}

export function RenameTopic({
  topic,
  allTopics,
}: {
  topic: TopicWithCount
  allTopics: TopicWithCount[]
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(topic.name)
  const [state, formAction, pending] = useActionState(
    async (previous: RenameTopicState, formData: FormData) => {
      const result = await renameTopic(topic.id, previous, formData)
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

  // A rename whose slug matches a *different* topic merges the two and deletes
  // this one. Warn before it happens, not after.
  const collision = useMemo(
    () => allTopics.find((other) => other.slug === slug && other.id !== topic.id),
    [allTopics, slug, topic.id],
  )

  const unslugifiable = trimmed.length > 0 && slug.length === 0
  const tooLong = trimmed.length > LIMITS.topicNameMax
  const blocked = trimmed.length === 0 || unslugifiable || tooLong

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label={`Rename ${topic.name}`}
          />
        }
      >
        <PencilIcon aria-hidden />
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename “{topic.name}”</DialogTitle>
          <DialogDescription>
            Topic names normalize to a slug, so renaming onto an existing name
            merges the two topics.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor={`rename-${topic.id}`}>Name</FieldLabel>
            <Input
              id={`rename-${topic.id}`}
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={LIMITS.topicNameMax + 20}
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
                Keep it under {LIMITS.topicNameMax} characters.
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
                This will <strong>merge “{topic.name}” into “{collision.name}”</strong>
                . All {topic.problemCount} problem{" "}
                {topic.problemCount === 1 ? "link" : "links"} move across and
                “{topic.name}” is deleted. This cannot be undone.
              </span>
            </p>
          )}

          {state.message && !state.ok && (
            <p role="alert" className="text-sm text-destructive">
              {state.message}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending || blocked}>
              {pending
                ? "Saving…"
                : collision
                  ? "Merge topics"
                  : "Rename"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
