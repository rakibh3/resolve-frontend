"use server"

import { revalidatePath } from "next/cache"

import { ApiError, apiFetch } from "@/lib/api/http"
import type { OwnerWithProfile, UserSettings } from "@/lib/api/types"

export type SettingsState = {
  ok?: boolean
  message?: string
  fieldErrors?: Record<string, string>
  /** True when the timezone moved, so the UI can explain what just changed. */
  timezoneChanged?: boolean
}

export async function updateSettings(
  currentTimezone: string,
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const body: Record<string, unknown> = {}

  const timezone = formData.get("timezone")?.toString()
  const reminderTime = formData.get("reminderTime")?.toString()

  if (timezone && timezone !== currentTimezone) body.timezone = timezone
  if (reminderTime) body.reminderTime = reminderTime

  // A JSON boolean, not the string "on" a checkbox would otherwise submit.
  if (formData.has("notificationsPresent")) {
    body.notificationsEnabled = formData.get("notificationsEnabled") === "on"
  }

  // `lastAcknowledgedDate` is deliberately absent: it belongs to the reminder
  // acknowledge endpoint and is not settable here.

  if (Object.keys(body).length === 0) {
    return { message: "Nothing to save — change a setting first." }
  }

  try {
    await apiFetch<UserSettings>("/api/settings", { method: "PATCH", body })
  } catch (error) {
    if (error instanceof ApiError) {
      return { message: error.message, fieldErrors: error.fieldErrors }
    }
    throw error
  }

  const timezoneChanged = "timezone" in body

  // A timezone change re-derives every date in the product — due dates, the
  // dashboard's "today", streaks, activity buckets, reminder timing — so the
  // whole tree has to go, not just this page.
  revalidatePath("/", "layout")

  return {
    ok: true,
    timezoneChanged,
    message: timezoneChanged
      ? "Saved. Due dates, streaks, and activity buckets have been re-derived in the new timezone."
      : "Settings saved.",
  }
}

export type ProfileState = {
  ok?: boolean
  message?: string
  fieldErrors?: Record<string, string>
  /** The owner has no profile row, which this endpoint requires. */
  missingProfile?: boolean
}

export async function updateProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  // Blank optional fields are omitted rather than sent as empty strings.
  const body = Object.fromEntries(
    (["name", "email", "profilePhoto", "bio"] as const)
      .map((key) => [key, formData.get(key)?.toString().trim()] as const)
      .filter(([, value]) => Boolean(value)),
  )

  if (Object.keys(body).length === 0) {
    return { message: "Change at least one field before saving." }
  }

  try {
    // PUT, not PATCH — even though the semantics are a partial update.
    await apiFetch<OwnerWithProfile>("/api/users/my-profile", {
      method: "PUT",
      body,
    })
  } catch (error) {
    if (error instanceof ApiError) {
      // This endpoint performs an unconditional nested profile update, so it
      // 404s when no profile row exists — even for a name-only change, and the
      // API's seed does not create one. That is worth saying plainly rather
      // than rendering a generic not-found.
      if (error.isNotFound) {
        return {
          missingProfile: true,
          message:
            "Your account has no profile record yet, and this endpoint requires one. Create the profile row on the API before editing your profile here.",
        }
      }
      return { message: error.message, fieldErrors: error.fieldErrors }
    }
    throw error
  }

  // The shell header renders the name and avatar.
  revalidatePath("/", "layout")

  return { ok: true, message: "Profile updated." }
}
