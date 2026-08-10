import { Suspense } from "react"
import type { Metadata } from "next"

import { RouteTransition } from "@/components/motion/streamed"
import { Skeleton } from "@/components/ui/skeleton"
import { ApiError } from "@/lib/api/http"
import { listTopics } from "@/lib/api/topics"
import type { TopicWithCount } from "@/lib/api/types"

import { CaptureModes } from "./_components/capture-modes"

export const metadata: Metadata = {
  title: "Add a problem",
}

export default function NewProblemPage() {
  return (
    <RouteTransition>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Add a problem
          </h1>
          <p className="text-sm text-muted-foreground">
            Captured problems have no revision cycle until you log the first
            attempt.
          </p>
        </div>

        <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
          <CaptureSlot />
        </Suspense>
      </div>
    </RouteTransition>
  )
}

/** Topic suggestions are useful but not required — a failure degrades to none. */
async function CaptureSlot() {
  let suggestions: TopicWithCount[]
  try {
    suggestions = await listTopics()
  } catch (error) {
    if (!(error instanceof ApiError)) throw error
    suggestions = []
  }

  return <CaptureModes suggestions={suggestions} />
}
