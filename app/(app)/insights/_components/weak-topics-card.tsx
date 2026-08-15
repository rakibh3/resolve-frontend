import { getTopicInsights } from "@/lib/api/insights"

import { VocabularyInsightCard } from "./vocabulary-insight-card"

/**
 * Weak topics, worst-first as returned.
 *
 * This endpoint takes no range — it is always all-time — so no range is passed.
 */
export async function WeakTopicsCard() {
  const insights = await getTopicInsights()

  return (
    <VocabularyInsightCard
      title="Weak topics"
      noun="topics"
      entries={insights.topics}
      weakEntries={insights.weakTopics}
      thresholds={insights.thresholds}
      hrefFor={(slug) => `/problems?topic=${slug}`}
      emptyState={
        <p className="text-sm text-muted-foreground">
          No topics yet. Capturing a problem from LeetCode brings its topics
          with it.
        </p>
      }
    />
  )
}
