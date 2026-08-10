"use server"

import { revalidatePath } from "next/cache"

import { ApiError, apiFetch } from "@/lib/api/http"
import { paths } from "@/lib/api/tags"
import type {
  AttemptCreated,
  AttemptDeleted,
  AttemptUpdated,
  LocalDate,
  PracticeState,
  RevisionStage,
} from "@/lib/api/types"
import { attemptSchema, toFieldErrors } from "@/lib/validation"

export type ScheduleSummary = {
  currentStage: RevisionStage | null
  nextDueDate: LocalDate | null
  practiceState: PracticeState | null
  /** Only the create response carries this; updates never do. */
  solutionViewed?: boolean
}

export type AttemptState = {
  ok?: boolean
  message?: string
  fieldErrors?: Record<string, string>
  schedule?: ScheduleSummary
}

/**
 * Every attempt write replays the problem's whole schedule, so all four of
 * these views can change — including from an edit to an attempt months old.
 */
function revalidateScheduleViews(problemId: string) {
  revalidatePath(paths.problem(problemId))
  revalidatePath(paths.problems)
  revalidatePath(paths.dashboard)
  revalidatePath(paths.insights)
}

/** Duration and confidence must be JSON numbers — the backend does not coerce. */
function readAttemptBody(formData: FormData) {
  const notes = formData.get("notes")?.toString().trim()
  const attemptedAt = formData.get("attemptedAt")?.toString()

  return {
    outcome: String(formData.get("outcome") ?? ""),
    durationMinutes: Number(formData.get("durationMinutes")),
    confidence: Number(formData.get("confidence")),
    notes: notes ? notes : null,
    // Omitted entirely when not backdating, so the backend defaults to now.
    ...(attemptedAt ? { attemptedAt } : {}),
  }
}

function describeSchedule(schedule: ScheduleSummary): string {
  if (schedule.currentStage === null) {
    return "Logged. This problem has no revision cycle."
  }
  if (schedule.nextDueDate === null) {
    return "Logged. This problem is now mastered."
  }
  return `Logged. Next revision ${schedule.nextDueDate}, at ${schedule.currentStage.replace("_", " ").toLowerCase()}.`
}

export async function logAttempt(
  problemId: string,
  _prev: AttemptState,
  formData: FormData,
): Promise<AttemptState> {
  const body = readAttemptBody(formData)

  const parsed = attemptSchema.safeParse(body)
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error) }
  }

  // The backend rejects future attempts with a 400; catching it here saves the
  // round trip and gives a better message.
  if (body.attemptedAt && new Date(body.attemptedAt) > new Date()) {
    return { fieldErrors: { attemptedAt: "An attempt cannot be in the future" } }
  }

  let result: AttemptCreated
  try {
    result = (
      await apiFetch<AttemptCreated>(`/api/problems/${problemId}/attempts`, {
        method: "POST",
        body,
      })
    ).data
  } catch (error) {
    if (error instanceof ApiError) {
      return { message: error.message, fieldErrors: error.fieldErrors }
    }
    throw error
  }

  revalidateScheduleViews(problemId)

  const schedule: ScheduleSummary = {
    currentStage: result.currentStage,
    nextDueDate: result.nextDueDate,
    practiceState: result.practiceState,
    solutionViewed: result.solutionViewed,
  }

  return { ok: true, message: describeSchedule(schedule), schedule }
}

export async function updateAttempt(
  problemId: string,
  attemptId: string,
  _prev: AttemptState,
  formData: FormData,
): Promise<AttemptState> {
  const body: Record<string, unknown> = {}

  const outcome = formData.get("outcome")?.toString()
  const duration = formData.get("durationMinutes")?.toString()
  const confidence = formData.get("confidence")?.toString()
  const notes = formData.get("notes")
  const attemptedAt = formData.get("attemptedAt")?.toString()

  if (outcome) body.outcome = outcome
  if (duration) body.durationMinutes = Number(duration)
  if (confidence) body.confidence = Number(confidence)
  if (notes !== null) body.notes = notes.toString().trim() || null
  if (attemptedAt) body.attemptedAt = attemptedAt

  // The backend rejects an empty patch, so it is never sent.
  if (Object.keys(body).length === 0) {
    return { message: "Change at least one field before saving." }
  }

  let result: AttemptUpdated
  try {
    result = (
      await apiFetch<AttemptUpdated>(`/api/attempts/${attemptId}`, {
        method: "PATCH",
        body,
      })
    ).data
  } catch (error) {
    if (error instanceof ApiError) {
      return { message: error.message, fieldErrors: error.fieldErrors }
    }
    throw error
  }

  revalidateScheduleViews(problemId)

  // Note: the update response carries no `solutionViewed`. It is deliberately
  // absent from this schedule summary rather than assumed unchanged.
  const schedule: ScheduleSummary = {
    currentStage: result.currentStage,
    nextDueDate: result.nextDueDate,
    practiceState: result.practiceState,
  }

  return {
    ok: true,
    message:
      schedule.nextDueDate === null
        ? "Attempt updated. This problem is now mastered."
        : `Attempt updated. The schedule replayed to ${schedule.nextDueDate}.`,
    schedule,
  }
}

export async function deleteAttempt(
  problemId: string,
  attemptId: string,
): Promise<AttemptState> {
  let result: AttemptDeleted
  try {
    result = (
      await apiFetch<AttemptDeleted>(`/api/attempts/${attemptId}`, {
        method: "DELETE",
      })
    ).data
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        message: error.isNotFound
          ? "That attempt no longer exists."
          : error.message,
      }
    }
    throw error
  }

  revalidateScheduleViews(problemId)

  return {
    ok: true,
    // A null stage means that was the last attempt and the cycle is gone.
    message:
      result.currentStage === null
        ? "Attempt deleted. This problem no longer has a revision cycle."
        : "Attempt deleted and the schedule replayed.",
    schedule: {
      currentStage: result.currentStage,
      nextDueDate: result.nextDueDate,
      practiceState: result.practiceState,
    },
  }
}
