import { notFound } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import { ArrowLeftIcon } from "lucide-react"

import { RouteTransition } from "@/components/motion/streamed"
import { ApiError } from "@/lib/api/http"
import { listPatterns } from "@/lib/api/patterns"
import { getProblem } from "@/lib/api/problems"
import type { PatternWithCount, ProblemDetail } from "@/lib/api/types"

import { RecallCardForm } from "./_components/recall-card-form"

export async function generateMetadata({
  params,
}: PageProps<"/problems/[id]/recall">): Promise<Metadata> {
  const { id } = await params
  try {
    const problem = await getProblem(id)
    return { title: `Recall · ${problem.title}` }
  } catch {
    return { title: "Recall card" }
  }
}

/**
 * The card editor.
 *
 * It reads the problem, not `GET /api/problems/:id/recall`: the detail response
 * already embeds the card text and carries `patterns` at its top level, and
 * `getProblem` is `cache()`-wrapped, so arriving here from the detail page
 * costs nothing extra. The standalone card endpoint would be a second request
 * for data already in hand — and its 404 conflates "no card yet" with "no such
 * problem".
 */
export default async function RecallCardPage({
  params,
}: PageProps<"/problems/[id]/recall">) {
  const { id } = await params

  let problem: ProblemDetail | null = null
  try {
    problem = await getProblem(id)
  } catch (error) {
    if (
      !(error instanceof ApiError) ||
      !(error.isNotFound || error.isValidationError)
    ) {
      throw error
    }
  }

  // Outside the catch — notFound() throws control flow that must not be caught.
  if (!problem) notFound()

  // Suggestions are a convenience; losing them should not lose the editor.
  let suggestions: PatternWithCount[]
  try {
    suggestions = await listPatterns()
  } catch (error) {
    if (!(error instanceof ApiError)) throw error
    suggestions = []
  }

  return (
    <RouteTransition>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div className="flex flex-col gap-3">
          <Link
            href={`/problems/${problem.id}`}
            transitionTypes={["nav-back"]}
            className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <ArrowLeftIcon className="size-3.5" aria-hidden />
            Back to {problem.title}
          </Link>

          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              {problem.recallCard ? "Edit recall card" : "Write a recall card"}
            </h1>
            <p className="text-sm text-muted-foreground">
              What you learned, as opposed to what you did. Writing a card never
              touches the revision schedule.
            </p>
          </div>
        </div>

        <RecallCardForm
          problemId={problem.id}
          problemTitle={problem.title}
          card={problem.recallCard}
          patterns={problem.patterns.map((pattern) => pattern.name)}
          suggestions={suggestions}
          needsRecallUpdate={problem.needsRecallUpdate}
        />
      </div>
    </RouteTransition>
  )
}
