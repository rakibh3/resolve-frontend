import { ApiError } from "@/lib/api/http"
import { listProblems, type ProblemListQuery } from "@/lib/api/problems"
import type { ApiMeta } from "@/lib/api/types"

import { EmptyLibrary, InvalidFilters, NoMatches } from "./library-states"
import { LibraryProblemRow } from "./library-problem-row"
import { Pagination } from "./pagination"
import { ResultsShell } from "./results-shell"

export async function LibraryResults({
  query,
  hasFilters,
}: {
  query: ProblemListQuery
  hasFilters: boolean
}) {
  let rows
  let meta: ApiMeta | undefined

  try {
    const result = await listProblems(query)
    rows = result.data
    meta = result.meta
  } catch (error) {
    // A 400 here means the URL carries an invalid filter value — recoverable,
    // and worth explaining rather than throwing to the error boundary.
    if (error instanceof ApiError && error.isValidationError) {
      return <InvalidFilters message={error.message} />
    }
    throw error
  }

  if (rows.length === 0) {
    return hasFilters ? <NoMatches /> : <EmptyLibrary />
  }

  return (
    <ResultsShell>
      <div className="flex flex-col gap-4">
        <div className="overflow-hidden rounded-none border-2 border-foreground bg-card shadow-[var(--shadow-neo)]">
          {rows.map((problem) => (
            <LibraryProblemRow key={problem.id} problem={problem} />
          ))}
        </div>

        {meta ? <Pagination meta={meta} /> : null}
      </div>
    </ResultsShell>
  )
}
