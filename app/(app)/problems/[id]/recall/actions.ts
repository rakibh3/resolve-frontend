"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { ApiError, apiFetch } from "@/lib/api/http"
import { paths, RECALL_MUTATION_PATHS } from "@/lib/api/tags"
import type { RecallCard, RecallCardInput } from "@/lib/api/types"
import { recallCardSchema, toFieldErrors } from "@/lib/validation"

export type RecallCardState = {
  ok?: boolean
  message?: string
  fieldErrors?: Record<string, string>
}

/**
 * Everything a card write makes stale.
 *
 * `/dashboard` is deliberately absent: a card carries no scheduling
 * information, so writing one cannot move a due date or change a practice
 * state. Revalidating it anyway would be a lie about what changed.
 */
function revalidateRecall(problemId: string) {
  revalidatePath(paths.problem(problemId))
  revalidatePath(paths.recallEditor(problemId))
  for (const path of RECALL_MUTATION_PATHS) revalidatePath(path)
}

/** An empty textarea clears the field; the API distinguishes `null` from `""`. */
function nullableText(formData: FormData, key: string): string | null {
  const value = formData.get(key)?.toString().trim() ?? ""
  return value.length > 0 ? value : null
}

export async function saveRecallCard(
  problemId: string,
  _prev: RecallCardState,
  formData: FormData,
): Promise<RecallCardState> {
  // Built from every field on the form, not just the ones that changed. The
  // endpoint is a PUT: anything omitted here is stored as empty, and an omitted
  // `patterns` list wipes the problem's patterns.
  const candidate = {
    keyInsight: formData.get("keyInsight")?.toString().trim() ?? "",
    approach: nullableText(formData, "approach"),
    pitfalls: nullableText(formData, "pitfalls"),
    timeComplexity: nullableText(formData, "timeComplexity"),
    spaceComplexity: nullableText(formData, "spaceComplexity"),
    patterns: formData
      .getAll("patterns")
      .map((value) => String(value).trim())
      .filter(Boolean),
  }

  const parsed = recallCardSchema.safeParse(candidate)
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error) }
  }

  const body: RecallCardInput = parsed.data

  let created: boolean
  try {
    // 201 means there was no card before; 200 means one was replaced. The body
    // is identical either way, so the status is the only signal.
    const result = await apiFetch<RecallCard>(
      `/api/problems/${problemId}/recall`,
      { method: "PUT", body },
    )
    created = result.statusCode === 201
  } catch (error) {
    if (error instanceof ApiError) {
      return { message: error.message, fieldErrors: error.fieldErrors }
    }
    throw error
  }

  revalidateRecall(problemId)

  return {
    ok: true,
    message: created
      ? "Card written. The revision schedule is untouched."
      : "Card replaced. Any stale flag is now cleared.",
  }
}

export async function deleteRecallCard(problemId: string) {
  await apiFetch<{ problemId: string }>(`/api/problems/${problemId}/recall`, {
    method: "DELETE",
  })

  revalidateRecall(problemId)

  // Outside any try/catch — redirect() throws a control-flow exception that a
  // handler must not swallow.
  redirect(paths.problem(problemId))
}
