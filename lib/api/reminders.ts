import "server-only"

import { cache } from "react"

import { apiFetch } from "./http"
import type { ReminderState } from "./types"

/**
 * Whether a reminder should be shown right now, and the server-rendered copy
 * for it. Show the banner when `active && !acknowledged`.
 *
 * Every authenticated request writes `lastActiveAt` on the user row, so any
 * refresh loop over this must be measured in minutes, not seconds.
 */
export const getReminderState = cache(async () => {
  const { data } = await apiFetch<ReminderState>("/api/reminders/current")
  return data
})
