import "server-only"

import { cache } from "react"

import { apiFetch } from "./http"
import type { UserSettings } from "./types"

/**
 * The owner's settings.
 *
 * Settings rows are created lazily with defaults on first read (`UTC`,
 * notifications off, `20:00`), so this never 404s.
 */
export const getSettings = cache(async () => {
  const { data } = await apiFetch<UserSettings>("/api/settings")
  return data
})

/** The owner's operative timezone, for formatting instants anywhere in the UI. */
export const getOwnerTimezone = cache(async () => (await getSettings()).timezone)
