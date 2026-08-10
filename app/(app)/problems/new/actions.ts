"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { ApiError, apiFetch } from "@/lib/api/http"
import { paths } from "@/lib/api/tags"
import type { ProblemCreated, ProblemPreview } from "@/lib/api/types"

/**
 * A discriminated union rather than a bag of optional flags, so the form has to
 * handle every branch the API can actually produce.
 */
export type PreviewResult =
  | { status: "resolved"; preview: ProblemPreview }
  /** `existingProblemId` is non-null — already in the library. */
  | { status: "exists"; preview: ProblemPreview }
  /** Metadata could not be resolved; fall back to manual entry. */
  | { status: "manual"; canonicalUrl?: string; message: string }
  | { status: "invalid"; message: string }

export async function previewProblem(url: string): Promise<PreviewResult> {
  try {
    const { data } = await apiFetch<ProblemPreview>("/api/problems/preview", {
      method: "POST",
      body: { url },
    })
    return data.existingProblemId
      ? { status: "exists", preview: data }
      : { status: "resolved", preview: data }
  } catch (error) {
    if (error instanceof ApiError && error.needsManualMetadata) {
      return {
        status: "manual",
        canonicalUrl: error.canonicalUrl,
        message: error.message,
      }
    }
    if (error instanceof ApiError && error.isValidationError) {
      return { status: "invalid", message: error.message }
    }
    throw error
  }
}

export type CaptureState = {
  message?: string
  fieldErrors?: Record<string, string>
  /** Set when the API asked for manual metadata; the form switches modes. */
  needsManual?: boolean
  canonicalUrl?: string
}

function readTopics(formData: FormData): string[] {
  return formData
    .getAll("topics")
    .flatMap((value) => String(value).split(","))
    .map((topic) => topic.trim())
    .filter(Boolean)
}

export async function captureProblem(
  _prev: CaptureState,
  formData: FormData,
): Promise<CaptureState> {
  const source = formData.get("source") === "CUSTOM" ? "CUSTOM" : "LEETCODE"
  const topics = readTopics(formData)
  const url = String(formData.get("url") ?? "").trim()

  const title = formData.get("title")?.toString().trim()
  const difficulty = formData.get("difficulty")?.toString()
  const statement = formData.get("statement")?.toString().trim()

  // Empty optional fields are omitted rather than sent as "".
  const body =
    source === "LEETCODE"
      ? {
          source,
          url,
          ...(title ? { title } : {}),
          ...(difficulty ? { difficulty } : {}),
          ...(topics.length ? { topics } : {}),
          ...(statement ? { statement } : {}),
        }
      : {
          source,
          title: title ?? "",
          difficulty: difficulty || "UNRATED",
          ...(topics.length ? { topics } : {}),
          ...(formData.get("sourceName")?.toString().trim()
            ? { sourceName: formData.get("sourceName")!.toString().trim() }
            : {}),
          ...(formData.get("sourceUrl")?.toString().trim()
            ? { sourceUrl: formData.get("sourceUrl")!.toString().trim() }
            : {}),
          ...(statement ? { statement } : {}),
        }

  // Supplying a title without a difficulty (or the reverse) is a 422 on the
  // LeetCode path — catching it here keeps the message specific.
  if (source === "LEETCODE" && Boolean(title) !== Boolean(difficulty)) {
    return {
      needsManual: true,
      canonicalUrl: url,
      message: "Manual metadata needs both a title and a difficulty.",
      fieldErrors: title
        ? { difficulty: "Choose a difficulty" }
        : { title: "Enter a title" },
    }
  }

  let created: ProblemCreated
  try {
    created = (
      await apiFetch<ProblemCreated>("/api/problems", { method: "POST", body })
    ).data
  } catch (error) {
    if (error instanceof ApiError && error.needsManualMetadata) {
      return {
        needsManual: true,
        canonicalUrl: error.canonicalUrl,
        message: error.message,
      }
    }
    if (error instanceof ApiError) {
      return { message: error.message, fieldErrors: error.fieldErrors }
    }
    throw error
  }

  // Capturing can create topics, which changes the vocabulary and the counts
  // that insights aggregate over.
  revalidatePath(paths.problems)
  revalidatePath(paths.topics)
  revalidatePath(paths.insights)

  // `alreadyExisted` arrives with a 200 and is a success, not an error — but it
  // is not a creation either, so the destination says which one happened.
  redirect(
    `/problems/${created.id}${created.alreadyExisted ? "?existing=1" : "?created=1"}`,
  )
}
