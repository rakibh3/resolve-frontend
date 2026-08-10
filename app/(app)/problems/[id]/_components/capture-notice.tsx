import { CheckCircle2Icon, InfoIcon } from "lucide-react"

/**
 * What just happened, on arrival from the capture flow.
 *
 * `alreadyExisted` comes back with an HTTP 200 and is a success — but it is not
 * a creation, so it must not claim one.
 */
export function CaptureNotice({
  created,
  existing,
}: {
  created: boolean
  existing: boolean
}) {
  if (!created && !existing) return null

  if (existing) {
    return (
      <p
        role="status"
        className="animate-fade-in-up flex items-start gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm"
      >
        <InfoIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span>
          This problem was already in your library — nothing new was created,
          and nothing was overwritten.
        </span>
      </p>
    )
  }

  return (
    <p
      role="status"
      className="animate-fade-in-up flex items-start gap-2 rounded-lg border border-state-mastered-foreground/20 bg-state-mastered/40 px-3 py-2 text-sm text-state-mastered-foreground"
    >
      <CheckCircle2Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        Captured. It has no revision cycle yet — log your first attempt below to
        start one at Day 0.
      </span>
    </p>
  )
}
