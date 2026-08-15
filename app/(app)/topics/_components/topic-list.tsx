import Link from "next/link"
import { TagsIcon } from "lucide-react"

import { FadeInUp } from "@/components/motion/fade-in-up"
import { Badge } from "@/components/ui/badge"
import { listTopics } from "@/lib/api/topics"
import { cn } from "@/lib/utils"

import { RenameTopic } from "./rename-topic"

export async function TopicList({ usedOnly }: { usedOnly: boolean }) {
  const topics = await listTopics(usedOnly)

  if (topics.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border p-8">
        <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <TagsIcon className="size-5" aria-hidden />
        </span>
        <h2 className="font-heading text-lg font-semibold tracking-tight">
          {usedOnly ? "No topics are in use" : "No topics yet"}
        </h2>
        <p className="max-w-prose text-sm text-muted-foreground">
          Topics are created automatically when you tag a problem — there is no
          way to add one directly. Capture a problem with a topic and it will
          appear here.
        </p>
      </div>
    )
  }

  return (
    // Server order: problem count descending, then name. Never re-sorted.
    <ul className="overflow-hidden rounded-xl border border-border bg-card">
      {topics.map((topic, index) => (
        <li key={topic.id}>
          <FadeInUp
            index={index}
            className="interactive-press flex items-center gap-3 border-b-2 border-foreground px-4 py-3 last:border-b-0 has-focus-visible:outline-2 has-focus-visible:outline-foreground has-focus-visible:outline-offset-2"
          >
            <Link
              // Filter by slug; display the name.
              href={`/problems?topic=${topic.slug}`}
              transitionTypes={["nav-forward"]}
              className="flex min-w-0 flex-1 items-center gap-2 focus-visible:outline-none"
            >
              <span className="truncate font-medium hover:underline">
                {topic.name}
              </span>
              <code className="truncate text-xs text-muted-foreground">
                {topic.slug}
              </code>
            </Link>

            <Badge
              variant={topic.problemCount === 0 ? "ghost" : "outline"}
              className={cn(
                "tabular-nums",
                topic.problemCount === 0 && "text-muted-foreground italic",
              )}
            >
              {topic.problemCount === 0
                ? "0 · unused"
                : `${topic.problemCount} ${topic.problemCount === 1 ? "problem" : "problems"}`}
            </Badge>

            <RenameTopic topic={topic} allTopics={topics} />
          </FadeInUp>
        </li>
      ))}
    </ul>
  )
}
