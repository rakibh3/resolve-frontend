import { Suspense, ViewTransition } from "react"

/**
 * A streamed section: skeleton yields to content with a crossfade instead of a
 * pop.
 *
 * The fallback MUST occupy the same footprint as the resolved content — a
 * crossfade over a shifting layout looks worse than no animation at all.
 *
 * `default="none"` keeps these from animating during unrelated transitions,
 * such as a route navigation happening elsewhere on the page.
 */
export function Streamed({
  fallback,
  children,
}: {
  fallback: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Suspense
      fallback={
        <ViewTransition exit="reveal-out" default="none">
          {fallback}
        </ViewTransition>
      }
    >
      <ViewTransition enter="reveal-in" default="none">
        {children}
      </ViewTransition>
    </Suspense>
  )
}

const NAV_DIRECTIONS = {
  "nav-forward": "nav-forward",
  "nav-back": "nav-back",
  default: "none",
} as const

/**
 * Wraps a page so navigations slide in the direction they mean.
 *
 * This belongs in `page.tsx`, never in a layout — layouts persist across
 * navigations, so their enter and exit never fire. Links opt in by passing
 * `transitionTypes={["nav-forward"]}` or `["nav-back"]`; untyped navigations
 * (browser back, `router.refresh()`, Suspense reveals) produce no directional
 * animation.
 */
export function RouteTransition({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition
      enter={NAV_DIRECTIONS}
      exit={NAV_DIRECTIONS}
      default="none"
    >
      {children}
    </ViewTransition>
  )
}
