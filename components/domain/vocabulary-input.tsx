"use client"

import { useId, useMemo, useRef, useState } from "react"
import { PlusIcon, XIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { slugifyName } from "@/lib/validation"

/** Either vocabulary's list shape — both carry a slug, a name, and a count. */
export type VocabularySuggestion = {
  slug: string
  name: string
  problemCount: number
}

/** How many entries to offer at once, before and after the owner types. */
const OPTION_LIMIT = 8

type Option =
  | ({ kind: "existing" } & VocabularySuggestion)
  | { kind: "create"; name: string }

/**
 * Tag entry that offers the existing vocabulary first and accepts free text
 * second.
 *
 * The existing entries are on screen from the moment the field renders, because
 * picking one is the common case and retyping a name that already exists is how
 * near-duplicates get made. Free text stays available — a card write is the only
 * way a new pattern can ever come into being — but it is presented as an
 * explicit "Create …" choice rather than the default path.
 *
 * Shared by topics and patterns because the backend normalizes both the same
 * way: trim → collapse whitespace → lowercase → hyphenate, then reuse the
 * existing row when the slug matches. "Binary Search" and "binary search" are
 * one tag and the first display name wins — surfaced as you type rather than
 * discovered after saving.
 *
 * Values are submitted as one hidden input per tag, so the Server Action reads
 * them with `formData.getAll(name)`. Both APIs take display **names** here, not
 * slugs.
 */
export function VocabularyInput({
  name,
  label,
  suggestions,
  defaultValue = [],
  maxLength,
  placeholder,
  description,
  hint,
}: {
  /** The form field name each tag is submitted under. */
  name: string
  label: string
  suggestions: VocabularySuggestion[]
  defaultValue?: string[]
  maxLength: number
  placeholder: string
  /** The steady-state help text, shown when nothing more specific applies. */
  description: string
  /** Optional extra line rendered under the field, above any error. */
  hint?: React.ReactNode
}) {
  const [values, setValues] = useState<string[]>(defaultValue)
  const [draft, setDraft] = useState("")
  const [highlight, setHighlight] = useState(-1)
  const fieldId = useId()
  const listId = `${fieldId}-options`
  const containerRef = useRef<HTMLDivElement>(null)

  const draftSlug = slugifyName(draft)
  const existing = useMemo(
    () => suggestions.find((entry) => entry.slug === draftSlug),
    [suggestions, draftSlug],
  )

  /** Everything not already committed, most-used first — the pick list. */
  const available = useMemo(() => {
    const taken = new Set(values.map((value) => slugifyName(value)))
    return suggestions
      .filter((entry) => !taken.has(entry.slug))
      .sort(
        (a, b) =>
          b.problemCount - a.problemCount || a.name.localeCompare(b.name),
      )
  }, [suggestions, values])

  const options = useMemo<Option[]>(() => {
    if (!draftSlug) {
      return available
        .slice(0, OPTION_LIMIT)
        .map((entry) => ({ kind: "existing", ...entry }))
    }

    const matched = available
      .filter((entry) => entry.slug.includes(draftSlug))
      .slice(0, OPTION_LIMIT)
      .map((entry) => ({ kind: "existing" as const, ...entry }))

    // Offering "Create" for a slug that already exists would invent a second
    // name for one row — the backend would merge them anyway.
    const trimmed = draft.trim()
    if (existing || trimmed.length > maxLength) return matched
    return [...matched, { kind: "create", name: trimmed }]
  }, [available, draftSlug, draft, existing, maxLength])

  // Clamped rather than reset in an effect: the list shrinks as the owner types
  // and a stale index would highlight the wrong entry for one render.
  const active = highlight >= 0 && highlight < options.length ? highlight : -1
  const tooLong = draft.trim().length > maxLength

  const add = (candidate: string) => {
    const trimmed = candidate.trim()
    if (!trimmed || trimmed.length > maxLength) return
    const slug = slugifyName(trimmed)
    if (!slug) return
    setDraft("")
    setHighlight(-1)
    if (values.some((entry) => slugifyName(entry) === slug)) return
    setValues((current) => [...current, trimmed])
  }

  return (
    <Field>
      <FieldLabel htmlFor={fieldId}>{label}</FieldLabel>

      <div
        ref={containerRef}
        className="flex flex-col gap-2"
        onBlur={(event) => {
          if (
            event.relatedTarget &&
            containerRef.current?.contains(event.relatedTarget)
          ) {
            return
          }
          setHighlight(-1)
          // Without this a name that was typed but never committed vanishes on
          // submit: only the hidden inputs are part of the form.
          if (draft.trim()) add(draft)
        }}
      >
        {values.map((value) => (
          <input key={value} type="hidden" name={name} value={value} />
        ))}

        {values.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {values.map((value) => (
              <li key={value}>
                <Badge variant="outline" className="gap-1 pr-1">
                  {value}
                  <button
                    type="button"
                    aria-label={`Remove ${value}`}
                    onClick={() =>
                      setValues((current) =>
                        current.filter((entry) => entry !== value),
                      )
                    }
                    className="rounded-none p-0.5 hover:bg-muted focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-offset-2 focus-visible:outline-none"
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
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={options.length > 0}
          aria-controls={listId}
          aria-activedescendant={
            active >= 0 ? `${listId}-${active}` : undefined
          }
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value)
            setHighlight(-1)
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              if (options.length === 0) return
              event.preventDefault()
              const next = active + (event.key === "ArrowDown" ? 1 : -1)
              setHighlight(
                next < 0
                  ? options.length - 1
                  : next >= options.length
                    ? 0
                    : next,
              )
              return
            }
            if (event.key === "Escape") {
              setHighlight(-1)
              return
            }
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault()
              add(active >= 0 ? options[active].name : draft)
            }
          }}
          placeholder={placeholder}
          aria-invalid={tooLong ? true : undefined}
          aria-describedby={`${fieldId}-hint`}
        />

        {options.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-muted-foreground">
              {draftSlug ? `Matching ${label.toLowerCase()}` : `Your ${label.toLowerCase()}`}
              {!draftSlug &&
                available.length > OPTION_LIMIT &&
                ` · type to reach ${available.length - OPTION_LIMIT} more`}
            </p>
            <ul
              id={listId}
              role="listbox"
              aria-label={`${label} to choose from`}
              className="flex flex-wrap gap-1.5"
            >
              {options.map((option, index) => (
                <li
                  key={option.kind === "create" ? " create" : option.slug}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === active}
                  // Keeps focus in the input so the field's blur-commit does not
                  // fire and swallow the click.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => add(option.name)}
                  className="cursor-pointer"
                >
                  {/*
                    Filled, unlike the committed chips above, which are outlined
                    and carry a remove button. The two rows sit one under the
                    other and must not read as the same thing.
                  */}
                  <Badge
                    variant={option.kind === "create" ? "outline" : "secondary"}
                    className={cn(
                      // they get the same outline rather than two rival treatments.
                      "gap-1.5 hover:outline hover:outline-2 hover:outline-foreground hover:outline-offset-2",
                      option.kind === "create" && "border-dashed",
                      index === active && "outline outline-2 outline-foreground outline-offset-2",
                    )}
                  >
                    {option.kind === "create" ? (
                      <>
                        <PlusIcon aria-hidden />
                        Create &ldquo;{option.name}&rdquo;
                      </>
                    ) : (
                      <>
                        {option.name}
                        <span className="tabular-nums opacity-70">
                          {option.problemCount}
                        </span>
                      </>
                    )}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <FieldDescription id={`${fieldId}-hint`}>
        {existing && existing.name !== draft.trim()
          ? `This will resolve to the existing entry “${existing.name}”.`
          : description}
      </FieldDescription>

      {hint}

      {tooLong && (
        <FieldError>
          {label} are limited to {maxLength} characters each.
        </FieldError>
      )}
    </Field>
  )
}
