/**
 * Motion rules for ReSolve.
 *
 * The tokens themselves live in `app/globals.css` (`--duration-*`, `--ease-*`,
 * `--stagger-*`). This module holds the numbers the two JS-driven animations
 * need, and the rules everything else follows:
 *
 * 1. **Only `transform` and `opacity`.** Never `width`, `height`, `top`, or
 *    `left` — those force layout on every frame. This is why entrances use
 *    `translate3d` and meters use `scale`/`stroke-dashoffset` rather than size.
 *
 * 2. **Animated components are leaves.** A component that needs client-side
 *    state to animate is the smallest possible Client Component; the Server
 *    Component that fetched its data stays a Server Component. `AnimatedNumber`
 *    is a client leaf — the dashboard section that produced the number is not.
 *
 * 3. **Motion never blocks data.** Nothing waits for an animation to finish
 *    before rendering a value, and no animation is on the path to first paint.
 *
 * 4. **Reduced motion is a hard cutoff, not a softening.** The global
 *    `@media (prefers-reduced-motion: reduce)` block in `globals.css` collapses
 *    every CSS animation and transition; the JS leaves check
 *    `prefersReducedMotion()` and jump straight to the final value.
 *
 * 5. **State is never carried by motion alone.** Anything an animation
 *    communicates is also readable from static text or an icon.
 */

export const DURATION = {
  fast: 150,
  base: 250,
  slow: 400,
  /** Matches the Bklit cartesian chart enter default. */
  reveal: 1100,
} as const

export const EASING = {
  out: "cubic-bezier(0.22, 1, 0.36, 1)",
  inOut: "cubic-bezier(0.65, 0, 0.35, 1)",
  /** The Bklit reveal curve. */
  reveal: "cubic-bezier(0.85, 0, 0.15, 1)",
} as const

export const STAGGER_STEP_MS = 55
/** Nothing waits longer than this, however deep in a list it sits. */
export const STAGGER_CAP_MS = 330

/** The per-item delay for a staggered entrance, bounded by the cap. */
export function staggerDelay(index: number): number {
  return Math.min(index * STAGGER_STEP_MS, STAGGER_CAP_MS)
}

/** The CSS custom property `<Stagger>` and `<FadeInUp>` read. */
export function enterDelayStyle(index: number): React.CSSProperties {
  return { "--enter-delay": `${staggerDelay(index)}ms` } as React.CSSProperties
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}
