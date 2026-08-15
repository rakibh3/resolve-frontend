"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { SearchIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { SearchScope } from "@/lib/api/types"
import { LIMITS } from "@/lib/validation"
import { cn } from "@/lib/utils"

const SEARCH_DEBOUNCE_MS = 350

const SCOPES: { value: SearchScope | "all"; label: string; hint: string }[] = [
  { value: "all", label: "Everything", hint: "Every field below" },
  { value: "problem", label: "Problems", hint: "Titles and statements" },
  { value: "recall", label: "Recall", hint: "Key insight, approach, pitfalls" },
  { value: "attempt", label: "Notes", hint: "What you wrote after an attempt" },
  { value: "vocabulary", label: "Tags", hint: "Topic and pattern names" },
]

/**
 * The query box and scope selector, both driven through the URL so a search is
 * linkable and the results are server-rendered.
 *
 * Typing is debounced rather than submitted: every authenticated request to
 * this API writes `lastActiveAt` on the user row, so a request per keystroke is
 * a write per keystroke.
 */
export function SearchControls() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  const urlQuery = searchParams.get("q") ?? ""
  const scope = searchParams.get("scope") ?? "all"
  const [draft, setDraft] = useState(urlQuery)
  const dirty = useRef(false)

  const commit = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams.toString())
      mutate(next)
      // Any change to the query or the scope invalidates the page number.
      next.delete("page")
      const query = next.toString()
      startTransition(() =>
        router.replace(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        }),
      )
    },
    [searchParams, pathname, router],
  )

  // Keep in step with back/forward navigation, but never fight the typing.
  useEffect(() => {
    if (!dirty.current) setDraft(urlQuery)
  }, [urlQuery])

  useEffect(() => {
    if (!dirty.current) return
    const timer = setTimeout(() => {
      dirty.current = false
      const value = draft.trim()
      commit((params) => {
        if (value) params.set("q", value)
        else params.delete("q")
      })
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [draft, commit])

  const trimmed = draft.trim()
  const tooShort = trimmed.length > 0 && trimmed.length < LIMITS.searchQueryMin
  const tooLong = trimmed.length > LIMITS.searchQueryMax

  return (
    <div className="flex flex-col gap-3" aria-busy={pending || undefined}>
      <div className="flex flex-col gap-1">
        <div className="relative">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={draft}
            autoFocus
            onChange={(event) => {
              dirty.current = true
              setDraft(event.target.value)
            }}
            placeholder="A phrase from a note, a card, a technique…"
            aria-label="Search everything you have written"
            aria-invalid={tooLong ? true : undefined}
            aria-describedby="search-hint"
            maxLength={LIMITS.searchQueryMax}
            className="h-11 pl-9 text-base"
          />
        </div>
        <p id="search-hint" className="text-xs text-muted-foreground">
          {tooShort
            ? `Keep typing — at least ${LIMITS.searchQueryMin} characters.`
            : tooLong
              ? `That is longer than the ${LIMITS.searchQueryMax}-character limit.`
              : "Substring matching, so “point” finds both “pointer” and “pointers”."}
        </p>
      </div>

      {/* A radio group, not links: the scope narrows the same query rather than
          navigating somewhere new. */}
      <div
        role="radiogroup"
        aria-label="Search scope"
        className="flex flex-wrap items-center gap-1.5"
      >
        {SCOPES.map((option) => {
          const active = scope === option.value
          return (
            <Button
              key={option.value}
              role="radio"
              aria-checked={active}
              size="sm"
              variant={active ? "secondary" : "ghost"}
              title={option.hint}
              className={cn(active && "font-medium")}
              onClick={() =>
                commit((params) => {
                  if (option.value === "all") params.delete("scope")
                  else params.set("scope", option.value)
                })
              }
            >
              {option.label}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
