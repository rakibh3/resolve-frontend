"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronDownIcon, InfoIcon, SearchIcon, XIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import type {
  Difficulty,
  PatternWithCount,
  PracticeState,
  ProblemSource,
  TopicWithCount,
} from "@/lib/api/types"
import { cn } from "@/lib/utils"

import { useFilters } from "./filter-provider"

const STATUSES: { value: PracticeState; label: string }[] = [
  { value: "OVERDUE", label: "Overdue" },
  { value: "DUE", label: "Due" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "MASTERED", label: "Mastered" },
  { value: "NEEDS_REINFORCEMENT", label: "Reinforcing" },
]

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: "EASY", label: "Easy" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HARD", label: "Hard" },
  { value: "UNRATED", label: "Unrated" },
]

const SOURCES: { value: ProblemSource; label: string }[] = [
  { value: "LEETCODE", label: "LeetCode" },
  { value: "CUSTOM", label: "Custom" },
]

const SOLUTION_VIEWED: { value: string; label: string }[] = [
  // The backend expects the string literals "true" / "false".
  { value: "true", label: "Seen" },
  { value: "false", label: "Never seen" },
]

const HAS_RECALL_CARD: { value: string; label: string }[] = [
  { value: "true", label: "Written up" },
  // The "attempted but never written up" backlog — the most useful of the two.
  { value: "false", label: "Not written up" },
]

const SEARCH_DEBOUNCE_MS = 350

/** Radio menus need a value meaning "no filter"; the URL just omits the key. */
const ANY = "__any"

/**
 * Search plus five facets.
 *
 * The facets live in menus rather than as five stacked chip rows. Expanded,
 * they cost ~530px above the first result — the whole point of the library is
 * the list, and pushing it below the fold to show filters nobody has chosen yet
 * is exactly the "overwhelm upfront" trade this should not make. Each trigger
 * carries its own active count, so nothing about the current filter state is
 * hidden by collapsing it.
 */
export function FilterBar({
  topics,
  patterns,
}: {
  topics: TopicWithCount[]
  patterns: PatternWithCount[]
}) {
  const filters = useFilters()
  const statusCount = filters.list("status").length
  const patternCount = filters.list("pattern").length

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <SearchField />

      <div className="flex flex-wrap items-center gap-1.5">
        <MultiFacet
          label="Status"
          filterKey="status"
          options={STATUSES}
          footnote="A status filter also excludes problems you have never attempted — they have no revision cycle to be in a state."
        />
        <MultiFacet
          label="Difficulty"
          filterKey="difficulty"
          options={DIFFICULTIES}
        />
        <SingleFacet label="Source" filterKey="source" options={SOURCES} />
        <SingleFacet
          label="Solution"
          filterKey="solutionViewed"
          options={SOLUTION_VIEWED}
        />
        <SingleFacet
          label="Recall"
          filterKey="hasRecallCard"
          options={HAS_RECALL_CARD}
        />
        {topics.length > 0 && (
          <VocabularyFacet
            label="Topics"
            filterKey="topic"
            options={topics}
            emptyHint="Topics come from LeetCode metadata and your own tagging."
          />
        )}
        {patterns.length > 0 && (
          <VocabularyFacet
            label="Patterns"
            filterKey="pattern"
            options={patterns}
            emptyHint="Patterns are named on recall cards, so a problem with no card can never match one."
          />
        )}

        {filters.activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={filters.clearAll}>
            <XIcon aria-hidden />
            Clear {filters.activeCount}{" "}
            {filters.activeCount === 1 ? "filter" : "filters"}
          </Button>
        )}
      </div>

      {/* Only while they actually apply, so they cost nothing by default. */}
      {statusCount > 0 && (
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <InfoIcon className="mt-px size-3 shrink-0" aria-hidden />
          Problems you have never attempted are excluded while a status filter
          is active — they have no revision cycle to be in a state.
        </p>
      )}

      {patternCount > 0 && (
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <InfoIcon className="mt-px size-3 shrink-0" aria-hidden />
          A pattern filter matches on the problem&rsquo;s recall card, so
          anything you have not written up is excluded.
        </p>
      )}
    </div>
  )
}

function SearchField() {
  const filters = useFilters()
  const urlQuery = filters.value("q") ?? ""
  const [draft, setDraft] = useState(urlQuery)
  const dirty = useRef(false)

  // Keep in step with back/forward navigation, but never fight the owner's
  // typing.
  useEffect(() => {
    if (!dirty.current) setDraft(urlQuery)
  }, [urlQuery])

  useEffect(() => {
    if (!dirty.current) return
    const timer = setTimeout(() => {
      dirty.current = false
      filters.set("q", draft.trim() || undefined)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [draft, filters])

  return (
    <div className="flex flex-col gap-1">
      {/* The icon centres against the input alone — the hint below has to sit
          outside this box, or `top-1/2` splits the pair and the icon drops
          through the bottom of the field. */}
      <div className="relative">
        <SearchIcon
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={draft}
          onChange={(event) => {
            dirty.current = true
            setDraft(event.target.value)
          }}
          placeholder="Search titles…"
          aria-label="Search problem titles"
          className="pl-8"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Matches titles only — not statements, notes, or topics.
      </p>
    </div>
  )
}

/** The shared trigger, so every facet reads the same when active. */
function FacetTrigger({ label, count }: { label: string; count: number }) {
  return (
    <DropdownMenuTrigger
      render={
        <Button
          variant={count > 0 ? "secondary" : "outline"}
          size="sm"
          // The count is part of the name, so the active state is not carried
          // by the badge's colour alone.
          aria-label={count > 0 ? `${label}, ${count} selected` : label}
        />
      }
    >
      {label}
      {count > 0 && (
        <Badge variant="default" className="tabular-nums">
          {count}
        </Badge>
      )}
      <ChevronDownIcon aria-hidden />
    </DropdownMenuTrigger>
  )
}

/** A facet the API accepts as a comma-separated list. */
function MultiFacet<T extends string>({
  label,
  filterKey,
  options,
  footnote,
}: {
  label: string
  filterKey: "status" | "difficulty"
  options: { value: T; label: string }[]
  footnote?: string
}) {
  const filters = useFilters()
  const selected = filters.list(filterKey)

  return (
    <DropdownMenu>
      <FacetTrigger label={label} count={selected.length} />

      <DropdownMenuContent align="start" className="min-w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
          {options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={selected.includes(option.value)}
              onCheckedChange={() => filters.toggle(filterKey, option.value)}
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>

        {footnote && (
          <>
            <DropdownMenuSeparator />
            <p className="max-w-56 px-2 py-1.5 text-xs text-muted-foreground">
              {footnote}
            </p>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** A facet the API accepts as a single value. */
function SingleFacet({
  label,
  filterKey,
  options,
}: {
  label: string
  filterKey: "source" | "solutionViewed" | "hasRecallCard"
  options: { value: string; label: string }[]
}) {
  const filters = useFilters()
  const current = filters.value(filterKey)
  const active = options.find((option) => option.value === current)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant={active ? "secondary" : "outline"}
            size="sm"
            aria-label={active ? `${label}: ${active.label}` : label}
          />
        }
      >
        {active ? `${label}: ${active.label}` : label}
        <ChevronDownIcon aria-hidden />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="min-w-44">
        <DropdownMenuRadioGroup
          value={current ?? ANY}
          // Selecting replaces rather than accumulates — the backend takes one
          // value — and "Any" clears the key from the URL entirely.
          onValueChange={(value) =>
            filters.set(filterKey, value === ANY ? undefined : String(value))
          }
        >
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
          <DropdownMenuRadioItem value={ANY}>Any</DropdownMenuRadioItem>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * A facet over one of the two vocabularies.
 *
 * Topics and patterns are separate vocabularies with separate query params, but
 * the control is identical: a scrolling checkbox menu, filtering by slug and
 * displaying the name, in the server's count-descending order.
 */
function VocabularyFacet({
  label,
  filterKey,
  options,
  emptyHint,
}: {
  label: string
  filterKey: "topic" | "pattern"
  options: (TopicWithCount | PatternWithCount)[]
  emptyHint: string
}) {
  const filters = useFilters()
  const selected = filters.list(filterKey)

  return (
    <DropdownMenu>
      <FacetTrigger label={label} count={selected.length} />

      {/* The vocabulary grows without bound, so the menu scrolls rather than
          the page. Server order is preserved: count descending, then name. */}
      <DropdownMenuContent
        align="start"
        className="max-h-80 min-w-60 overflow-y-auto"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
          {options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.slug}
              // Filter by slug, display name.
              checked={selected.includes(option.slug)}
              onCheckedChange={() => filters.toggle(filterKey, option.slug)}
            >
              <span className="flex-1 truncate">{option.name}</span>
              <span
                className={cn(
                  "tabular-nums text-muted-foreground",
                  option.problemCount === 0 && "italic",
                )}
              >
                {option.problemCount}
              </span>
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        <p className="max-w-56 px-2 py-1.5 text-xs text-muted-foreground">
          {emptyHint}
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
