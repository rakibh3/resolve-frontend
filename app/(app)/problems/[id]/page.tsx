import { Suspense } from "react"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { ExternalLinkIcon, EyeIcon } from "lucide-react"

import { AttemptForm } from "@/app/(app)/_components/attempt-form"
import { DifficultyBadge } from "@/components/domain/difficulty-badge"
import { PatternChips } from "@/components/domain/pattern-chips"
import { PracticeStateBadge } from "@/components/domain/practice-state-badge"
import { RecallBadge, recallStatus } from "@/components/domain/recall-badge"
import { stageLabel } from "@/components/domain/stage-label"
import { TopicChips } from "@/components/domain/topic-chips"
import { FadeInUp } from "@/components/motion/fade-in-up"
import { RouteTransition } from "@/components/motion/streamed"
import { Skeleton } from "@/components/ui/skeleton"
import { ApiError } from "@/lib/api/http"
import { getProblem } from "@/lib/api/problems"
import { getSettings } from "@/lib/api/settings"
import { listTopics } from "@/lib/api/topics"
import type { ProblemDetail, TopicWithCount } from "@/lib/api/types"
import { formatLocalDate, todayInZone } from "@/lib/date"

import { AttemptHistory } from "./_components/attempt-history"
import { CaptureNotice } from "./_components/capture-notice"
import { DeleteProblem } from "./_components/delete-problem"
import { EditMetadata } from "./_components/edit-metadata"
import { RecallCardPanel } from "./_components/recall-card-panel"
import { RescheduleForm } from "./_components/reschedule-form"
import { RevisionFeed } from "./_components/revision-feed"
import { RevisionTimeline } from "./_components/revision-timeline"

export async function generateMetadata({
  params,
}: PageProps<"/problems/[id]">): Promise<Metadata> {
  const { id } = await params
  try {
    const problem = await getProblem(id)
    return { title: problem.title }
  } catch {
    return { title: "Problem" }
  }
}

export default async function ProblemPage({
  params,
  searchParams,
}: PageProps<"/problems/[id]">) {
  const { id } = await params
  const query = await searchParams

  let problem: ProblemDetail | null = null
  let failure: ApiError | null = null

  try {
    problem = await getProblem(id)
  } catch (error) {
    // 404 is an unknown id; 400 is an unparseable one. Both mean "not in your
    // library", so both get the not-found treatment.
    if (error instanceof ApiError && (error.isNotFound || error.isValidationError)) {
      failure = error
    } else {
      throw error
    }
  }

  // Outside the try/catch — notFound() throws a control-flow exception that
  // must not be swallowed by the handler above.
  if (failure || !problem) notFound()

  const settings = await getSettings().catch(() => null)
  const timezone = settings?.timezone ?? "UTC"
  const today = todayInZone(timezone)

  const canReschedule =
    problem.currentStage !== null && problem.practiceState !== "MASTERED"

  return (
    <RouteTransition>
      <div className="flex flex-col gap-6">
        <CaptureNotice
          created={query.created === "1"}
          existing={query.existing === "1"}
        />

        <header className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-2">
              <h1 className="font-heading text-2xl font-semibold tracking-tight">
                {problem.title}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                <DifficultyBadge difficulty={problem.difficulty} />
                <PracticeStateBadge state={problem.practiceState} />
                <RecallBadge
                  status={recallStatus({
                    hasRecallCard: problem.hasRecallCard,
                    needsRecallUpdate: problem.needsRecallUpdate,
                  })}
                />
                {problem.solutionViewed && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <EyeIcon className="size-3" aria-hidden />
                    Solution viewed
                  </span>
                )}
              </div>
              <TopicChips topics={problem.topics} />
              <PatternChips patterns={problem.patterns} />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canReschedule && (
                <RescheduleForm
                  problemId={problem.id}
                  today={today}
                  currentDueDate={problem.nextDueDate}
                />
              )}
              <Suspense fallback={<Skeleton className="h-7 w-20 rounded-lg" />}>
                <EditMetadataSlot problem={problem} />
              </Suspense>
              <DeleteProblem
                problemId={problem.id}
                title={problem.title}
                attemptCount={problem.attemptCount}
              />
            </div>
          </div>

          <ExternalLinks problem={problem} />
        </header>

        <FadeInUp className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-heading text-lg font-semibold tracking-tight">
              Revision cycle
            </h2>
            <p className="text-sm text-muted-foreground">
              {problem.currentStage
                ? `${stageLabel(problem.currentStage)} · next ${formatLocalDate(problem.nextDueDate)}`
                : "Not started"}
            </p>
          </div>

          {problem.cycleStartsOnFirstAttempt || problem.timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              This problem has no revision cycle yet. Logging your first attempt
              starts it at Day 0.
            </p>
          ) : (
            <RevisionTimeline timeline={problem.timeline} />
          )}
        </FadeInUp>

        {problem.statement && (
          <FadeInUp
            index={1}
            className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4"
          >
            <h2 className="font-heading text-lg font-semibold tracking-tight">
              Statement
            </h2>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">
              {problem.statement}
            </p>
          </FadeInUp>
        )}

        {/* Knowledge before history: the card is what the owner comes back to
            read, and it sits above the attempt log rather than under it. */}
        <FadeInUp
          index={2}
          className="rounded-xl border border-border bg-card p-4"
        >
          <RecallCardPanel
            problemId={problem.id}
            card={problem.recallCard}
            patterns={problem.patterns}
            needsRecallUpdate={problem.needsRecallUpdate}
            timezone={timezone}
          />
        </FadeInUp>

        <FadeInUp
          index={3}
          className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4"
        >
          <h2 className="font-heading text-lg font-semibold tracking-tight">
            Log an attempt
          </h2>
          <AttemptForm problemId={problem.id} timezone={timezone} />
        </FadeInUp>

        <div className="grid gap-4 lg:grid-cols-2">
          <FadeInUp
            index={4}
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
          >
            <h2 className="font-heading text-lg font-semibold tracking-tight">
              Attempts
            </h2>
            {/* Already in the detail response, newest first — no second request. */}
            <AttemptHistory
              problemId={problem.id}
              attempts={problem.attempts}
              timezone={timezone}
            />
          </FadeInUp>

          <FadeInUp
            index={5}
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
          >
            <h2 className="font-heading text-lg font-semibold tracking-tight">
              Revision history
            </h2>
            <RevisionFeed events={problem.revisions} timezone={timezone} />
          </FadeInUp>
        </div>
      </div>
    </RouteTransition>
  )
}

function ExternalLinks({ problem }: { problem: ProblemDetail }) {
  if (!problem.canonicalUrl && !problem.sourceUrl) {
    return problem.sourceName ? (
      <p className="text-sm text-muted-foreground">{problem.sourceName}</p>
    ) : null
  }

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      {problem.canonicalUrl && (
        <a
          href={problem.canonicalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Open on LeetCode
          <ExternalLinkIcon className="size-3.5" aria-hidden />
        </a>
      )}
      {problem.sourceUrl && (
        <a
          href={problem.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          {problem.sourceName ?? "Source"}
          <ExternalLinkIcon className="size-3.5" aria-hidden />
        </a>
      )}
    </div>
  )
}

/** Topic suggestions for the edit form; a failure degrades to none. */
async function EditMetadataSlot({ problem }: { problem: ProblemDetail }) {
  let suggestions: TopicWithCount[]
  try {
    suggestions = await listTopics()
  } catch (error) {
    if (!(error instanceof ApiError)) throw error
    suggestions = []
  }

  return <EditMetadata problem={problem} suggestions={suggestions} />
}
