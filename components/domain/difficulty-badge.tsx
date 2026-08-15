import { Badge } from "@/components/ui/badge"
import type { Difficulty } from "@/lib/api/types"
import { cn } from "@/lib/utils"

/**
 * The single definition of how a difficulty looks, so `MEDIUM` is identical on
 * the dashboard, in the library, and on the detail page.
 *
 * The dot is decorative; the label is what carries the meaning.
 */
const PRESENTATION: Record<Difficulty, { label: string; className: string }> = {
  EASY: {
    label: "Easy",
    className: "bg-difficulty-easy text-difficulty-easy-foreground",
  },
  MEDIUM: {
    label: "Medium",
    className: "bg-difficulty-medium text-difficulty-medium-foreground",
  },
  HARD: {
    label: "Hard",
    className: "bg-difficulty-hard text-difficulty-hard-foreground",
  },
  UNRATED: {
    label: "Unrated",
    className: "bg-difficulty-unrated text-difficulty-unrated-foreground",
  },
}

export function DifficultyBadge({
  difficulty,
  className,
}: {
  difficulty: Difficulty
  className?: string
}) {
  const { label, className: tone } = PRESENTATION[difficulty]

  return (
    <Badge className={cn(tone, className)}>
      <span
        aria-hidden
        className="size-1.5 rounded-none bg-current opacity-70"
      />
      {label}
    </Badge>
  )
}

export function difficultyLabel(difficulty: Difficulty): string {
  return PRESENTATION[difficulty].label
}
