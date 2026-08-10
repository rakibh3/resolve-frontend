import type { RevisionStage } from "@/lib/api/types"

/**
 * Stage names for display. The offsets (0/1/7/15/30 days from the cycle anchor)
 * are the engine's business — nothing here computes a date from a stage.
 */
const STAGE_LABELS: Record<RevisionStage, string> = {
  DAY_0: "Day 0",
  DAY_1: "Day 1",
  DAY_7: "Day 7",
  DAY_15: "Day 15",
  DAY_30: "Day 30",
}

export function stageLabel(stage: RevisionStage | null): string {
  return stage === null ? "No cycle" : STAGE_LABELS[stage]
}

export function StageLabel({ stage }: { stage: RevisionStage | null }) {
  return <span className="tabular-nums">{stageLabel(stage)}</span>
}
