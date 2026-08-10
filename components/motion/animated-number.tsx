"use client"

import { useEffect, useRef } from "react"

import { DURATION, prefersReducedMotion } from "@/lib/motion"
import { cn } from "@/lib/utils"

type AnimatedNumberProps = {
  value: number
  /** Decimal places to render. Rates and averages want 1 or 2. */
  decimals?: number
  suffix?: string
  className?: string
  /** Overrides the announced text — e.g. "85% completed on time". */
  label?: string
}

/**
 * A count-up numeral, and one of only two animations in the app that need JS.
 *
 * This is a leaf on purpose: the Server Component that fetched the number stays
 * a Server Component and passes the resolved value down.
 *
 * The animated text is `aria-hidden` and the final value is rendered once in a
 * visually hidden span, so assistive technology hears the number rather than
 * every intermediate frame.
 */
export function AnimatedNumber({
  value,
  decimals = 0,
  suffix,
  className,
  label,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const previous = useRef(0)
  const frame = useRef<number | null>(null)

  const format = (input: number) =>
    input.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const from = previous.current
    previous.current = value

    if (prefersReducedMotion() || from === value) {
      node.textContent = format(value)
      return
    }

    const start = performance.now()
    const duration = DURATION.slow
    const ease = (t: number) => 1 - Math.pow(1 - t, 3)

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      node.textContent = format(from + (value - from) * ease(progress))
      if (progress < 1) {
        frame.current = requestAnimationFrame(tick)
      }
    }

    frame.current = requestAnimationFrame(tick)
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
    }
    // `format` is derived from `decimals`, which is in the dependency list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, decimals])

  return (
    <span className={cn("inline-flex items-baseline", className)}>
      {/* Tabular figures keep the layout still while the digits change. */}
      <span ref={ref} aria-hidden className="tabular-nums">
        {format(value)}
      </span>
      {suffix ? (
        <span aria-hidden className="text-[0.7em]">
          {suffix}
        </span>
      ) : null}
      <span className="sr-only">
        {label ?? `${format(value)}${suffix ?? ""}`}
      </span>
    </span>
  )
}

/**
 * The em-dash counterpart. Nullable aggregates (`rate`, `averageMinutes`) must
 * never render as `0` — that is a different fact from "nothing has come due".
 */
export function NullableNumber({
  value,
  decimals,
  suffix,
  className,
  emptyLabel = "No data yet",
}: Omit<AnimatedNumberProps, "value"> & {
  value: number | null
  emptyLabel?: string
}) {
  if (value === null) {
    return (
      <span className={className}>
        <span aria-hidden>—</span>
        <span className="sr-only">{emptyLabel}</span>
      </span>
    )
  }

  return (
    <AnimatedNumber
      value={value}
      decimals={decimals}
      suffix={suffix}
      className={className}
    />
  )
}
