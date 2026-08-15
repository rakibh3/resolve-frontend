import { z } from "zod"

/**
 * Client-side mirrors of the backend's Zod schemas.
 *
 * These exist so the common validation failures never cost a round trip. They
 * are NOT the authority: the server's `errorDetails.issues[]` always wins, and
 * every form maps those onto its fields through `ApiError.fieldErrors`. When
 * the backend's constraints change, change them here too — this module is the
 * one place the duplication lives.
 */

export const LIMITS = {
  attemptDurationMin: 1,
  attemptDurationMax: 1440,
  confidenceMin: 1,
  confidenceMax: 5,
  notesMax: 2000,
  titleMax: 300,
  topicNameMax: 60,
  sourceNameMax: 200,
  statementMax: 20000,
  rescheduleReasonMax: 500,
  profileNameMin: 2,
  profileNameMax: 100,
  bioMax: 500,
  insightsRangeDays: 365,
  // ── Recall layer ──
  patternNameMax: 60,
  keyInsightMax: 280,
  approachMax: 4000,
  pitfallsMax: 2000,
  complexityMax: 40,
  // ── Search ──
  searchQueryMin: 2,
  searchQueryMax: 200,
} as const

export const localDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the yyyy-MM-dd format")

/** 24-hour, zero-padded. "8:00" and "24:00" are both rejected by the backend. */
export const reminderTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a 24-hour HH:mm time, e.g. 08:00")

export const absoluteHttpUrlSchema = z
  .string()
  .trim()
  .refine((value) => {
    try {
      const url = new URL(value)
      return url.protocol === "http:" || url.protocol === "https:"
    } catch {
      return false
    }
  }, "Enter a full http(s) URL")

export const difficultySchema = z.enum([
  "EASY",
  "MEDIUM",
  "HARD",
  "UNRATED",
])

/** LeetCode problems cannot be UNRATED — the backend rejects it with a 400. */
export const ratedDifficultySchema = z.enum(["EASY", "MEDIUM", "HARD"])

export const attemptOutcomeSchema = z.enum([
  "SOLVED_INDEPENDENTLY",
  "SOLVED_WITH_HINT",
  "VIEWED_SOLUTION",
])

export const topicNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a topic name")
  .max(LIMITS.topicNameMax, `Keep it under ${LIMITS.topicNameMax} characters`)

export const patternNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a pattern name")
  .max(
    LIMITS.patternNameMax,
    `Keep it under ${LIMITS.patternNameMax} characters`,
  )

/**
 * Topic renames slugify to trim → collapse whitespace → lowercase → hyphenate.
 * A name that slugifies to nothing (e.g. "!!!") is a 400.
 */
export const topicRenameSchema = z.object({
  name: topicNameSchema.refine(
    (value) => slugifyName(value).length > 0,
    "That name contains no letters or numbers to slugify",
  ),
})

/** Patterns normalize exactly like topics, and renaming one merges the same way. */
export const patternRenameSchema = z.object({
  name: patternNameSchema.refine(
    (value) => slugifyName(value).length > 0,
    "That name contains no letters or numbers to slugify",
  ),
})

/**
 * Mirrors the backend's vocabulary normalization, for collision detection.
 *
 * Topics and patterns are separate vocabularies but share this rule, which is
 * why the function is not named for either of them.
 */
export function slugifyName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

// ── Attempts ────────────────────────────────────────────────────────────────

/**
 * Sent as JSON numbers. The backend uses `z.number()` with no coercion, so the
 * string "22" is a 400.
 */
export const attemptSchema = z.object({
  outcome: attemptOutcomeSchema,
  durationMinutes: z
    .number()
    .int("Enter whole minutes")
    .min(LIMITS.attemptDurationMin, "At least 1 minute")
    .max(LIMITS.attemptDurationMax, "At most 1440 minutes (24 hours)"),
  confidence: z
    .number()
    .int()
    .min(LIMITS.confidenceMin, "Rate your confidence from 1 to 5")
    .max(LIMITS.confidenceMax, "Rate your confidence from 1 to 5"),
  notes: z
    .string()
    .max(LIMITS.notesMax, `Keep notes under ${LIMITS.notesMax} characters`)
    .nullable()
    .optional(),
  /** Omitted to mean "now". Never in the future. */
  attemptedAt: z.iso.datetime().optional(),
})

export type AttemptInput = z.infer<typeof attemptSchema>

/** At least one field, mirroring the backend's "provide at least one" rule. */
export const attemptPatchSchema = attemptSchema
  .partial()
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    "Change at least one field",
  )

// ── Problems ────────────────────────────────────────────────────────────────

export const problemTitleSchema = z
  .string()
  .trim()
  .min(1, "Enter a title")
  .max(LIMITS.titleMax, `Keep the title under ${LIMITS.titleMax} characters`)

export const statementSchema = z
  .string()
  .max(LIMITS.statementMax, "That statement is too long")

export const leetcodeUrlSchema = z
  .string()
  .trim()
  .min(1, "Paste a LeetCode problem URL")
  .refine((value) => {
    try {
      const url = new URL(value)
      return (
        url.hostname.replace(/^www\./, "") === "leetcode.com" &&
        url.pathname.startsWith("/problems/")
      )
    } catch {
      return false
    }
  }, "That is not a LeetCode problem URL")

export const leetcodeCaptureSchema = z.object({
  source: z.literal("LEETCODE"),
  url: leetcodeUrlSchema,
  /** Supplying a title switches the request into manual-entry mode. */
  title: problemTitleSchema.optional(),
  /** Required together with `title`; UNRATED is rejected for LeetCode. */
  difficulty: ratedDifficultySchema.optional(),
  topics: z.array(topicNameSchema).optional(),
  statement: statementSchema.optional(),
})

export const customCaptureSchema = z.object({
  source: z.literal("CUSTOM"),
  title: problemTitleSchema,
  difficulty: difficultySchema.default("UNRATED"),
  topics: z.array(topicNameSchema).optional(),
  sourceName: z
    .string()
    .trim()
    .max(LIMITS.sourceNameMax, "That source name is too long")
    .optional(),
  sourceUrl: absoluteHttpUrlSchema.optional(),
  statement: statementSchema.optional(),
})

export const problemPatchSchema = z
  .object({
    title: problemTitleSchema,
    difficulty: difficultySchema,
    /** Replaces the entire topic set — send the full desired list. */
    topics: z.array(topicNameSchema),
    sourceName: z.string().trim().max(LIMITS.sourceNameMax).nullable(),
    sourceUrl: absoluteHttpUrlSchema.nullable(),
    statement: statementSchema.nullable(),
  })
  .partial()
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    "Change at least one field",
  )

// ── Recall cards ────────────────────────────────────────────────────────────

/**
 * The whole card, because the endpoint is a `PUT`.
 *
 * There is no partial variant on purpose: `PUT /api/problems/:id/recall`
 * clears every field the body omits, patterns included. A schema that allowed
 * a subset would validate a request that silently destroys the rest of the
 * card.
 */
export const recallCardSchema = z.object({
  keyInsight: z
    .string()
    .trim()
    .min(1, "A card needs at least one key insight")
    .max(
      LIMITS.keyInsightMax,
      `Keep the insight under ${LIMITS.keyInsightMax} characters — it is the one line you reread`,
    ),
  approach: z
    .string()
    .max(LIMITS.approachMax, "That approach is too long")
    .nullable(),
  pitfalls: z
    .string()
    .max(LIMITS.pitfallsMax, "That pitfalls note is too long")
    .nullable(),
  timeComplexity: z
    .string()
    .trim()
    .max(LIMITS.complexityMax, `Keep it under ${LIMITS.complexityMax} characters`)
    .nullable(),
  spaceComplexity: z
    .string()
    .trim()
    .max(LIMITS.complexityMax, `Keep it under ${LIMITS.complexityMax} characters`)
    .nullable(),
  /** Display names, not slugs — and the full desired set, not a delta. */
  patterns: z.array(patternNameSchema),
})

export type RecallCardFormInput = z.infer<typeof recallCardSchema>

// ── Search ──────────────────────────────────────────────────────────────────

export const searchScopeSchema = z.enum([
  "problem",
  "recall",
  "attempt",
  "vocabulary",
])

/**
 * Below the minimum the API answers 400, so the page renders a prompt instead
 * of calling. This predicate is that gate.
 */
export function isSearchable(query: string | undefined): query is string {
  const trimmed = query?.trim() ?? ""
  return (
    trimmed.length >= LIMITS.searchQueryMin &&
    trimmed.length <= LIMITS.searchQueryMax
  )
}

// ── Revisions ───────────────────────────────────────────────────────────────

export const rescheduleSchema = z.object({
  dueDate: localDateSchema,
  /** Not optional — a reschedule is an audited decision. */
  reason: z
    .string()
    .trim()
    .min(1, "Say why you are moving this revision")
    .max(LIMITS.rescheduleReasonMax, "Keep the reason under 500 characters"),
})

// ── Settings & profile ──────────────────────────────────────────────────────

export const settingsPatchSchema = z
  .object({
    timezone: z.string().min(1, "Choose a timezone"),
    notificationsEnabled: z.boolean(),
    reminderTime: reminderTimeSchema,
  })
  .partial()
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    "Change at least one setting",
  )

export const profileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(LIMITS.profileNameMin, "Use at least 2 characters")
      .max(LIMITS.profileNameMax, "Use at most 100 characters"),
    email: z.email("Enter a valid email address").trim(),
    profilePhoto: absoluteHttpUrlSchema,
    bio: z
      .string()
      .max(LIMITS.bioMax, `Keep your bio under ${LIMITS.bioMax} characters`),
  })
  .partial()

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Flattens a Zod error into the `{ field: message }` shape forms render. */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path[0]
    if (typeof key === "string" && !(key in fieldErrors)) {
      fieldErrors[key] = issue.message
    }
  }
  return fieldErrors
}
