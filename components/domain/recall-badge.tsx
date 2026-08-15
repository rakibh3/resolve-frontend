import {
  BookOpenCheckIcon,
  FileQuestionIcon,
  TriangleAlertIcon,
  type LucideIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

/**
 * How much a problem's written-up knowledge can be trusted.
 *
 * Three states, collapsed from two booleans the API derives per read:
 *
 * - **stale** — `needsRecallUpdate`: a `VIEWED_SOLUTION` attempt is newer than
 *   the card, so the owner had to look the answer up after writing their notes.
 *   The card is known to be incomplete, and this is the one worth interrupting
 *   for.
 * - **written** — a card exists and nothing has invalidated it.
 * - **none** — nothing written yet.
 *
 * Like every other state badge here, each carries an icon and a label so the
 * meaning does not rest on colour alone.
 */
export type RecallStatus = "stale" | "written" | "none"

export function recallStatus({
  hasRecallCard,
  needsRecallUpdate,
}: {
  hasRecallCard: boolean
  needsRecallUpdate: boolean
}): RecallStatus {
  if (needsRecallUpdate) return "stale"
  return hasRecallCard ? "written" : "none"
}

const PRESENTATION: Record<
  RecallStatus,
  { label: string; description: string; Icon: LucideIcon; className: string }
> = {
  stale: {
    label: "Card is stale",
    description:
      "You viewed a solution after writing this card, so it is missing what you had to look up",
    Icon: TriangleAlertIcon,
    className: "bg-state-overdue text-state-overdue-foreground",
  },
  written: {
    label: "Written up",
    description: "This problem has a recall card",
    Icon: BookOpenCheckIcon,
    className: "bg-state-mastered text-state-mastered-foreground",
  },
  none: {
    label: "No card",
    description: "Nothing written up for this problem yet",
    Icon: FileQuestionIcon,
    className: "bg-state-idle text-state-idle-foreground",
  },
}

export function RecallBadge({
  status,
  className,
}: {
  status: RecallStatus
  className?: string
}) {
  const { label, description, Icon, className: tone } = PRESENTATION[status]

  return (
    <Badge className={cn(tone, className)} title={description}>
      <Icon aria-hidden />
      {label}
    </Badge>
  )
}
