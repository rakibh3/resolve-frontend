"use client"

import { useSyncExternalStore } from "react"

const noop = () => () => {}

/**
 * `false` during server render and hydration, `true` afterwards.
 *
 * Used where something is only knowable on the client — the active theme, the
 * Notification permission — so the first client render matches the server's and
 * the real value appears on the next one. `useSyncExternalStore` gives this
 * without a setState-in-effect cascade.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  )
}
