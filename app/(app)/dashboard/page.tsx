import type { Metadata } from "next"

import { RouteTransition, Streamed } from "@/components/motion/streamed"

import { DashboardRefresher } from "./_components/dashboard-refresher"
import { TodaySection } from "./_components/today-section"
import { TodaySkeleton } from "./_components/today-skeleton"

export const metadata: Metadata = {
  title: "Today",
}

export default function DashboardPage() {
  return (
    <RouteTransition>
      <div className="flex flex-col gap-6">
        {/* The heading paints immediately; the data streams in behind it. */}
        <h1 className="font-heading text-2xl font-extrabold tracking-tight">
          Today
        </h1>

        <Streamed fallback={<TodaySkeleton />}>
          <TodaySection />
        </Streamed>

        <DashboardRefresher />
      </div>
    </RouteTransition>
  )
}
