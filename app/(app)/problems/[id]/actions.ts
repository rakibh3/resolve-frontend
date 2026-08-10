"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { ApiError, apiFetch } from "@/lib/api/http"
import { paths } from "@/lib/api/tags"
import type { Problem, RescheduleResult } from "@/lib/api/types"

export type ProblemFormState = {
  ok?: boolean
  message?: string
  fieldErrors?: Record<string, string>
}

/**
 * Reads a nullable text field.
 *
 * Omitting a field leaves it unchanged; sending `null` clears it. An empty
 * input therefore has to become an explicit `null`, not an omission and not an
 * empty string.
 */
function nullableText(formData: FormData, key: string): string | null {
  const value = formData.get(key)
  if (value === null) return null
  const trimmed = value.toString().trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function updateProblem(
  problemId: string,
  _prev: ProblemFormState,
  formData: FormData,
): Promise<ProblemFormState> {
  const body: Record<string, unknown> = {}

  const title = formData.get("title")?.toString().trim()
  const difficulty = formData.get("difficulty")?.toString()
  if (title) body.title = title
  if (difficulty) body.difficulty = difficulty

  // `topics` replaces the whole set, so it is only sent when the form actually
  // carries the topic editor — otherwise an untouched form would unlink
  // everything.
  if (formData.get("topicsEdited") === "1") {
    body.topics = formData
      .getAll("topics")
      .map((value) => String(value).trim())
      .filter(Boolean)
  }

  for (const key of ["sourceName", "sourceUrl", "statement"] as const) {
    if (formData.has(key)) body[key] = nullableText(formData, key)
  }

  // The backend rejects an empty patch with a 400, so it is never sent.
  if (Object.keys(body).length === 0) {
    return { message: "Change at least one field before saving." }
  }

  try {
    await apiFetch<Problem>(`/api/problems/${problemId}`, {
      method: "PATCH",
      body,
    })
  } catch (error) {
    if (error instanceof ApiError) {
      return { message: error.message, fieldErrors: error.fieldErrors }
    }
    throw error
  }

  // Metadata edits never touch the schedule — only the views that show the
  // metadata itself.
  revalidatePath(paths.problem(problemId))
  revalidatePath(paths.problems)
  revalidatePath(paths.topics)

  return { ok: true, message: "Saved. The revision schedule is unchanged." }
}

export async function deleteProblem(problemId: string) {
  await apiFetch<{ id: string }>(`/api/problems/${problemId}`, {
    method: "DELETE",
  })

  revalidatePath(paths.problems)
  revalidatePath(paths.dashboard)
  revalidatePath(paths.insights)
  revalidatePath(paths.topics)

  redirect("/problems")
}

export async function rescheduleRevision(
  problemId: string,
  _prev: ProblemFormState,
  formData: FormData,
): Promise<ProblemFormState> {
  // Already yyyy-MM-dd from <input type="date">. It is sent verbatim: turning
  // it into an ISO instant would reinterpret it in the wrong timezone.
  const dueDate = formData.get("dueDate")?.toString() ?? ""
  const reason = formData.get("reason")?.toString().trim() ?? ""

  if (!dueDate) {
    return { fieldErrors: { dueDate: "Choose a date" } }
  }
  if (!reason) {
    return {
      fieldErrors: { reason: "A reason is required when rescheduling" },
    }
  }

  let result: RescheduleResult
  try {
    result = (
      await apiFetch<RescheduleResult>(
        `/api/problems/${problemId}/revisions/reschedule`,
        { method: "PATCH", body: { dueDate, reason } },
      )
    ).data
  } catch (error) {
    if (error instanceof ApiError) {
      // The backend's messages here are specific and worth showing verbatim.
      return { message: error.message, fieldErrors: error.fieldErrors }
    }
    throw error
  }

  revalidatePath(paths.problem(problemId))
  revalidatePath(paths.problems)
  revalidatePath(paths.dashboard)
  revalidatePath(paths.insights)

  return {
    ok: true,
    message: `Moved to ${result.dueDate}. Only this occurrence changed — later stages keep their anchor.`,
  }
}
