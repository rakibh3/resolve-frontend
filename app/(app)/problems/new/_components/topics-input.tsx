"use client"

import { useId, useMemo, useState } from "react"
import { XIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { TopicWithCount } from "@/lib/api/types"
import { LIMITS, slugifyTopic } from "@/lib/validation"

/**
 * Free-text topic entry with suggestions from the existing vocabulary.
 *
 * The backend normalizes every topic to a slug (trim → collapse whitespace →
 * lowercase → hyphenate) and reuses the existing row when the slug matches, so
 * "Binary Search" and "binary search" are the same topic and the first display
 * name wins. That is surfaced as you type rather than discovered afterwards.
 */
export function TopicsInput({
  suggestions,
  defaultValue = [],
}: {
  suggestions: TopicWithCount[]
  defaultValue?: string[]
}) {
  const [topics, setTopics] = useState<string[]>(defaultValue)
  const [draft, setDraft] = useState("")
  const fieldId = useId()

  const draftSlug = slugifyTopic(draft)
  const existing = useMemo(
    () => suggestions.find((topic) => topic.slug === draftSlug),
    [suggestions, draftSlug],
  )
  const matches = useMemo(() => {
    if (!draftSlug) return []
    return suggestions
      .filter(
        (topic) =>
          topic.slug.includes(draftSlug) &&
          !topics.some((added) => slugifyTopic(added) === topic.slug),
      )
      .slice(0, 6)
  }, [suggestions, draftSlug, topics])

  const tooLong = draft.trim().length > LIMITS.topicNameMax

  const add = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed || trimmed.length > LIMITS.topicNameMax) return
    const slug = slugifyTopic(trimmed)
    if (!slug) return
    if (topics.some((topic) => slugifyTopic(topic) === slug)) {
      setDraft("")
      return
    }
    setTopics((current) => [...current, trimmed])
    setDraft("")
  }

  return (
    <Field>
      <FieldLabel htmlFor={fieldId}>Topics</FieldLabel>

      {/* One hidden input per topic, so the action reads them with getAll(). */}
      {topics.map((topic) => (
        <input key={topic} type="hidden" name="topics" value={topic} />
      ))}

      {topics.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {topics.map((topic) => (
            <li key={topic}>
              <Badge variant="outline" className="gap-1 pr-1">
                {topic}
                <button
                  type="button"
                  aria-label={`Remove ${topic}`}
                  onClick={() =>
                    setTopics((current) =>
                      current.filter((entry) => entry !== topic),
                    )
                  }
                  className="rounded-full p-0.5 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <XIcon className="size-3" aria-hidden />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}

      <Input
        id={fieldId}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault()
            add(draft)
          }
        }}
        placeholder="Add a topic and press Enter"
        aria-invalid={tooLong ? true : undefined}
        aria-describedby={`${fieldId}-hint`}
      />

      {matches.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {matches.map((topic) => (
            <li key={topic.slug}>
              <button
                type="button"
                onClick={() => add(topic.name)}
                className="focus-visible:outline-none"
              >
                <Badge variant="ghost" className="gap-1.5">
                  {topic.name}
                  <span className="tabular-nums opacity-70">
                    {topic.problemCount}
                  </span>
                </Badge>
              </button>
            </li>
          ))}
        </ul>
      )}

      <FieldDescription id={`${fieldId}-hint`}>
        {existing && existing.name !== draft.trim()
          ? `This will resolve to the existing topic “${existing.name}”.`
          : `Up to ${LIMITS.topicNameMax} characters each. Case and spacing are normalized, so “Binary Search” and “binary search” are the same topic.`}
      </FieldDescription>

      {tooLong && (
        <FieldError>
          Topic names are limited to {LIMITS.topicNameMax} characters.
        </FieldError>
      )}
    </Field>
  )
}
