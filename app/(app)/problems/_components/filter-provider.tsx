"use client"

import {
  createContext,
  use,
  useCallback,
  useMemo,
  useTransition,
} from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

/**
 * Owns URL synchronization for the library filters.
 *
 * The controls below this provider read and write filter values; none of them
 * knows how the URL is spelled. That keeps the serialization rules — CSV lists,
 * `"true"`/`"false"` string literals, dropping empty values, resetting the page
 * — in exactly one place.
 */

export type FilterKey =
  | "status"
  | "difficulty"
  | "topic"
  | "source"
  | "solutionViewed"
  | "q"
  | "sortBy"
  | "sortOrder"
  | "page"

type FilterContextValue = {
  /** Multi-value params, already split out of their comma-separated form. */
  list: (key: FilterKey) => string[]
  value: (key: FilterKey) => string | undefined
  /** Sets or clears a single value. Clearing removes the param entirely. */
  set: (key: FilterKey, value: string | undefined) => void
  /** Sets or clears a list. An empty list removes the param entirely. */
  setList: (key: FilterKey, values: string[]) => void
  toggle: (key: FilterKey, value: string) => void
  clearAll: () => void
  activeCount: number
  pending: boolean
}

const FilterContext = createContext<FilterContextValue | null>(null)

/** Everything except paging and sorting counts as a "filter" for the UI. */
const FILTER_KEYS: FilterKey[] = [
  "status",
  "difficulty",
  "topic",
  "source",
  "solutionViewed",
  "q",
]

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  const commit = useCallback(
    (next: URLSearchParams) => {
      const query = next.toString()
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        })
      })
    },
    [router, pathname],
  )

  const value = useMemo<FilterContextValue>(() => {
    const read = (key: FilterKey) => searchParams.get(key) ?? undefined

    /** Any filter or sort change resets paging — page 3 of a new result set is
        rarely where the owner wants to land. */
    const mutate = (apply: (params: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams.toString())
      apply(next)
      next.delete("page")
      commit(next)
    }

    return {
      list: (key) => read(key)?.split(",").filter(Boolean) ?? [],
      value: read,

      set: (key, newValue) => {
        // `page` is the one key that must not reset itself.
        if (key === "page") {
          const next = new URLSearchParams(searchParams.toString())
          if (newValue && newValue !== "1") next.set("page", newValue)
          else next.delete("page")
          commit(next)
          return
        }
        mutate((params) => {
          if (newValue) params.set(key, newValue)
          else params.delete(key)
        })
      },

      setList: (key, values) => {
        mutate((params) => {
          if (values.length > 0) params.set(key, values.join(","))
          else params.delete(key)
        })
      },

      toggle: (key, item) => {
        mutate((params) => {
          const current = params.get(key)?.split(",").filter(Boolean) ?? []
          const next = current.includes(item)
            ? current.filter((entry) => entry !== item)
            : [...current, item]
          if (next.length > 0) params.set(key, next.join(","))
          else params.delete(key)
        })
      },

      clearAll: () => {
        const next = new URLSearchParams(searchParams.toString())
        for (const key of FILTER_KEYS) next.delete(key)
        next.delete("page")
        commit(next)
      },

      activeCount: FILTER_KEYS.filter((key) => searchParams.get(key)).length,
      pending,
    }
  }, [searchParams, commit, pending])

  return <FilterContext value={value}>{children}</FilterContext>
}

export function useFilters(): FilterContextValue {
  const context = use(FilterContext)
  if (!context) {
    throw new Error("useFilters must be used inside a <FilterProvider>")
  }
  return context
}
