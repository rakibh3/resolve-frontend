"use server"

import { revalidatePath } from "next/cache"

import { apiFetch } from "@/lib/api/http"
import type { ReminderState } from "@/lib/api/types"

/**
 * Dismisses today's reminder.
 *
 * Acknowledging when nothing is active is harmless and idempotent on the
 * backend, so there is no pre-check here. Acknowledgement is stored as a local
 * date and resets by itself at the owner's midnight.
 */
export async function acknowledgeReminder() {
  await apiFetch<ReminderState>("/api/reminders/acknowledge", {
    method: "POST",
  })
  // The banner lives in the shell layout.
  revalidatePath("/", "layout")
}
