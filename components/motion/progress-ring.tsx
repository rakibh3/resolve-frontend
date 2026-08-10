"use client"

import { useEffect, useRef } from "react"

import { DURATION, EASING, prefersReducedMotion } from "@/lib/motion"
import { cn } from "@/lib/utils"

type ProgressRingProps = {
  /** 0–1. `null` renders the explicit empty state with no fill animation. */
  value: number | null
  size?: number
  strokeWidth?: number
  className?: string
  /** Rendered inside the ring. Usually an AnimatedNumber. */
  children?: React.ReactNode
  /** What the ring means, for assistive technology. */
  label: string
}

/**
 * A radial meter for the streak and the revision-completion rate.
 *
 * The fill is animated with the Web Animations API over `stroke-dashoffset` —
 * the one exception to the transform/opacity rule, because it is the only way
 * to draw an arc progressively and it does not trigger layout.
 *
 * A `null` value is not zero: it means "nothing has come due yet", so the ring
 * renders empty with an em dash rather than animating to 0%.
 */
export function ProgressRing({
  value,
  size = 96,
  strokeWidth = 8,
  className,
  children,
  label,
}: ProgressRingProps) {
  const ref = useRef<SVGCircleElement>(null)

  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = value === null ? 0 : Math.min(Math.max(value, 0), 1)
  const offset = circumference * (1 - clamped)

  useEffect(() => {
    const node = ref.current
    if (!node || value === null) return

    if (prefersReducedMotion()) {
      node.style.strokeDashoffset = String(offset)
      return
    }

    const animation = node.animate(
      [{ strokeDashoffset: circumference }, { strokeDashoffset: offset }],
      {
        duration: DURATION.reveal,
        easing: EASING.reveal,
        fill: "forwards",
      },
    )

    return () => animation.cancel()
  }, [value, offset, circumference])

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted"
        />
        {value !== null && (
          <circle
            ref={ref}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference}
            className="stroke-[var(--chart-1)]"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {value === null ? (
          <span aria-hidden className="text-2xl text-muted-foreground">
            —
          </span>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
