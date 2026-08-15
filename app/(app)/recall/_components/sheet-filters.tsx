"use client"

import { useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ChevronDownIcon, XIcon } from "lucide-react"

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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type {
  Difficulty,
  PatternWithCount,
  PracticeState,
  TopicWithCount,
} from "@/lib/api/types"
import { cn } from "@/lib/utils"

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: "EASY", label: "Easy" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HARD", label: "Hard" },
  { value: "UNRATED", label: "Unrated" },
]

const STATUSES: { value: PracticeState; label: string }[] = [
  { value: "OVERDUE", label: "Overdue" },
  { value: "DUE", label: "Due" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "MASTERED", label: "Mastered" },
  { value: "NEEDS_REINFORCEMENT", label: "Reinforcing" },
]

/** Radio menus need a value meaning "no filter"; the URL just omits the key. */
const ANY = "__any"

const KEYS = ["pattern", "topic", "difficulty", "status"] as const

/**
 * The sheet's four filters, driven entirely from the URL so a filtered skim
 * stays linkable.
 *
 * `pattern` and `topic` are comma-separated lists on this endpoint;
 * `difficulty` and `status` take a **single** value, unlike the library
 * listing where both are lists. That asymmetry is the API's, and it is why
 * these are two different controls rather than one generic one.
 */
export function SheetFilters({
  patterns,
  topics,
}: {
  patterns: PatternWithCount[]
  topics: TopicWithCount[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  const commit = (next: URLSearchParams) => {
    const query = next.toString()
    startTransition(() =>
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      }),
    )
  }

  const list = (key: string) =>
    searchParams.get(key)?.split(",").filter(Boolean) ?? []

  const toggle = (key: string, item: string) => {
    const next = new URLSearchParams(searchParams.toString())
    const current = list(key)
    const updated = current.includes(item)
      ? current.filter((entry) => entry !== item)
      : [...current, item]
    if (updated.length > 0) next.set(key, updated.join(","))
    else next.delete(key)
    commit(next)
  }

  const setSingle = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(searchParams.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    commit(next)
  }

  const activeCount = KEYS.filter((key) => searchParams.get(key)).length

  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      aria-busy={pending || undefined}
    >
      <ListFacet
        label="Patterns"
        selected={list("pattern")}
        options={patterns}
        onToggle={(slug) => toggle("pattern", slug)}
      />
      <ListFacet
        label="Topics"
        selected={list("topic")}
        options={topics}
        onToggle={(slug) => toggle("topic", slug)}
      />
      <SingleFacet
        label="Difficulty"
        current={searchParams.get("difficulty") ?? undefined}
        options={DIFFICULTIES}
        onChange={(value) => setSingle("difficulty", value)}
      />
      <SingleFacet
        label="Status"
        current={searchParams.get("status") ?? undefined}
        options={STATUSES}
        onChange={(value) => setSingle("status", value)}
      />

      {activeCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const next = new URLSearchParams(searchParams.toString())
            for (const key of KEYS) next.delete(key)
            commit(next)
          }}
        >
          <XIcon aria-hidden />
          Clear {activeCount} {activeCount === 1 ? "filter" : "filters"}
        </Button>
      )}
    </div>
  )
}

function ListFacet({
  label,
  selected,
  options,
  onToggle,
}: {
  label: string
  selected: string[]
  options: { slug: string; name: string; problemCount: number }[]
  onToggle: (slug: string) => void
}) {
  if (options.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant={selected.length > 0 ? "secondary" : "outline"}
            size="sm"
            // The count is part of the accessible name, so the active state is
            // never carried by the badge's colour alone.
            aria-label={
              selected.length > 0
                ? `${label}, ${selected.length} selected`
                : label
            }
          />
        }
      >
        {label}
        {selected.length > 0 && (
          <Badge variant="default" className="tabular-nums">
            {selected.length}
          </Badge>
        )}
        <ChevronDownIcon aria-hidden />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="max-h-80 min-w-60 overflow-y-auto"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
          {options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.slug}
              checked={selected.includes(option.slug)}
              onCheckedChange={() => onToggle(option.slug)}
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
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function SingleFacet({
  label,
  current,
  options,
  onChange,
}: {
  label: string
  current: string | undefined
  options: { value: string; label: string }[]
  onChange: (value: string | undefined) => void
}) {
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
          onValueChange={(value) =>
            onChange(value === ANY ? undefined : String(value))
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
