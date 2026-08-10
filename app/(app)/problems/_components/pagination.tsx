"use client"

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { ApiMeta } from "@/lib/api/types"

import { useFilters } from "./filter-provider"

/**
 * Paging is driven entirely by the response `meta`, and only the `page` param
 * changes — every active filter survives the move.
 */
export function Pagination({ meta }: { meta: ApiMeta }) {
  const filters = useFilters()
  const totalPages =
    meta.totalPages ?? Math.max(1, Math.ceil(meta.total / meta.limit))

  if (meta.total === 0) return null

  const first = (meta.page - 1) * meta.limit + 1
  const last = Math.min(meta.page * meta.limit, meta.total)

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3"
    >
      <p className="text-sm text-muted-foreground tabular-nums">
        {first}–{last} of {meta.total.toLocaleString()}
        {totalPages > 1 ? ` · page ${meta.page} of ${totalPages}` : ""}
      </p>

      {totalPages > 1 && (
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            disabled={meta.page <= 1 || filters.pending}
            onClick={() => filters.set("page", String(meta.page - 1))}
          >
            <ChevronLeftIcon aria-hidden />
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={meta.page >= totalPages || filters.pending}
            onClick={() => filters.set("page", String(meta.page + 1))}
          >
            Next
            <ChevronRightIcon aria-hidden />
          </Button>
        </div>
      )}
    </nav>
  )
}
