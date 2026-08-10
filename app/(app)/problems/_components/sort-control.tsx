"use client"

import { ArrowDownUpIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { useFilters } from "./filter-provider"

const SORT_FIELDS = [
  { value: "createdAt", label: "Date added" },
  { value: "title", label: "Title" },
  { value: "difficulty", label: "Difficulty" },
  { value: "nextDueAt", label: "Next due" },
] as const

const HINTS: Record<string, string> = {
  // Not alphabetical — this is the backend's enum declaration order.
  difficulty: "Ordered Easy → Medium → Hard → Unrated.",
  nextDueAt: "Problems with no due date sort last.",
  createdAt: "Newest first by default.",
}

export function SortControl() {
  const filters = useFilters()
  const sortBy = filters.value("sortBy") ?? "createdAt"
  const sortOrder = filters.value("sortOrder") ?? defaultOrder(sortBy)
  const activeLabel =
    SORT_FIELDS.find((field) => field.value === sortBy)?.label ?? "Date added"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
        <ArrowDownUpIcon aria-hidden />
        {activeLabel}
        <span className="text-muted-foreground">
          {sortOrder === "asc" ? "↑" : "↓"}
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-56">
        {/* The label belongs inside the group it names: Base UI throws without
            a group ancestor, and wires the group's accessible name from it. */}
        <DropdownMenuRadioGroup
          value={sortBy}
          onValueChange={(value) => filters.set("sortBy", String(value))}
        >
          <DropdownMenuLabel>Sort by</DropdownMenuLabel>
          {SORT_FIELDS.map((field) => (
            <DropdownMenuRadioItem key={field.value} value={field.value}>
              {field.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        <DropdownMenuRadioGroup
          value={sortOrder}
          onValueChange={(value) => filters.set("sortOrder", String(value))}
        >
          <DropdownMenuLabel>Direction</DropdownMenuLabel>
          <DropdownMenuRadioItem value="asc">Ascending</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="desc">Descending</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>

        {HINTS[sortBy] && (
          <>
            <DropdownMenuSeparator />
            <p className="px-2 py-1.5 text-xs text-muted-foreground">
              {HINTS[sortBy]}
            </p>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Mirrors the backend's default: descending for createdAt, ascending otherwise. */
function defaultOrder(sortBy: string): "asc" | "desc" {
  return sortBy === "createdAt" ? "desc" : "asc"
}
