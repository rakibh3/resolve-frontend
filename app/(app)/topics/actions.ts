"use server"

import { revalidatePath } from "next/cache"

import { ApiError, apiFetch } from "@/lib/api/http"
import { paths } from "@/lib/api/tags"
import type { Topic } from "@/lib/api/types"

export type RenameTopicState = {
  ok?: boolean
  message?: string
  fieldErrors?: Record<string, string>
  /** True when the response's id differs from the one sent — a merge happened. */
  merged?: boolean
  survivingName?: string
}

export async function renameTopic(
  topicId: string,
  _prev: RenameTopicState,
  formData: FormData,
): Promise<RenameTopicState> {
  const name = formData.get("name")?.toString().trim() ?? ""

  if (!name) {
    return { fieldErrors: { name: "Enter a name" } }
  }

  let topic: Topic
  try {
    topic = (
      await apiFetch<Topic>(`/api/topics/${topicId}`, {
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

  // A rename can destroy a topic: when the new name normalizes to an existing
  // topic's slug, the two are merged, the renamed row is deleted, and the
  // SURVIVING topic comes back — so the id returned may not be the id sent.
  const merged = topic.id !== topicId

  revalidatePath(paths.topics)
  revalidatePath(paths.problems)
  revalidatePath(paths.insights)

  return {
    ok: true,
    merged,
    survivingName: topic.name,
    message: merged
      ? `Merged into “${topic.name}”. Every problem link moved across and the old topic is gone.`
      : `Renamed to “${topic.name}”.`,
  }
}
