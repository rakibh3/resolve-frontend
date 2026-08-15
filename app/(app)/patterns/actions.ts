"use server"

import { revalidatePath } from "next/cache"

import { ApiError, apiFetch } from "@/lib/api/http"
import { paths } from "@/lib/api/tags"
import type { Pattern } from "@/lib/api/types"

export type RenamePatternState = {
  ok?: boolean
  message?: string
  fieldErrors?: Record<string, string>
  /** True when the response's id differs from the one sent — a merge happened. */
  merged?: boolean
  survivingName?: string
}

export async function renamePattern(
  patternId: string,
  _prev: RenamePatternState,
  formData: FormData,
): Promise<RenamePatternState> {
  const name = formData.get("name")?.toString().trim() ?? ""

  if (!name) {
    return { fieldErrors: { name: "Enter a name" } }
  }

  let pattern: Pattern
  try {
    pattern = (
      await apiFetch<Pattern>(`/api/patterns/${patternId}`, {
        method: "PATCH",
        body: { name },
      })
    ).data
  } catch (error) {
    if (error instanceof ApiError) {
      return { message: error.message, fieldErrors: error.fieldErrors }
    }
    throw error
  }

  // Renaming is also how two patterns get merged, which is the whole point
  // here: hand-typed techniques accumulate near-duplicates, and collapsing
  // `two-pointer` into `two-pointers` months later is routine. On a collision
  // the renamed row is deleted and the SURVIVOR comes back, so the id returned
  // may not be the id sent.
  const merged = pattern.id !== patternId

  revalidatePath(paths.patterns)
  revalidatePath(paths.problems)
  revalidatePath(paths.recall)
  revalidatePath(paths.insights)

  return {
    ok: true,
    merged,
    survivingName: pattern.name,
    message: merged
      ? `Merged into “${pattern.name}”. Every card link moved across and the old pattern is gone.`
      : `Renamed to “${pattern.name}”.`,
  }
}
