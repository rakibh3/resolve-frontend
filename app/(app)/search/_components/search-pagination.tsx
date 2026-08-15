"use client"

import { useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { ApiMeta } from "@/lib/api/types"

/**
 * Paging within the bounded candidate set.
 *
 * When `meta.truncated` is true, `meta.total` is the capped count and not the
 * library-wide total — so the summary line says "first N", not "N results".
 */
export function SearchPagination({ meta }: { meta: ApiMeta }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  const totalPages =
    meta.totalPages ?? Math.max(1, Math.ceil(meta.total / meta.limit))

  if (meta.total === 0) return null

  const first = (meta.page - 1) * meta.limit + 1
  const last = Math.min(meta.page * meta.limit, meta.total)

  const goTo = (page: number) => {
    const next = new URLSearchParams(searchParams.toString())
    if (page > 1) next.set("page", String(page))
    else next.delete("page")
    const query = next.toString()
    startTransition(() =>
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      }),
    )
  }

  return (
    <nav
      aria-label="Search result pages"
      className="flex flex-wrap items-center justify-between gap-3"
    >
      <p className="text-sm text-muted-foreground tabular-nums">
        {first}–{last} of {meta.truncated ? "the first " : ""}
        {meta.total.toLocaleString()}
        {totalPages > 1 ? ` · page ${meta.page} of ${totalPages}` : ""}
      </p>

      {totalPages > 1 && (
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            disabled={meta.page <= 1 || pending}
            onClick={() => goTo(meta.page - 1)}
          >
            <ChevronLeftIcon aria-hidden />
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={meta.page >= totalPages || pending}
            onClick={() => goTo(meta.page + 1)}
          >
            Next
            <ChevronRightIcon aria-hidden />
          </Button>
        </div>
      )}
    </nav>
  )
}
