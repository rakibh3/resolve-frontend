/**
 * Shapes returned by the ReSolve API.
 *
 * These mirror the backend's Prisma enums and presenter shapes exactly. See
 * `docs/API_INTEGRATION.md` §5 — this file is the frontend's copy of that
 * contract and should be updated in lockstep with it.
 */

// ── Primitives ──────────────────────────────────────────────────────────────

/**
 * A calendar day in the owner's timezone, `yyyy-MM-dd`. Sorts and compares
 * correctly as a plain string.
 *
 * Never pass one of these through `new Date()` for locale formatting: that
 * parses as UTC midnight and renders as the previous day west of UTC. Use the
 * helpers in `lib/date.ts`.
 */
export type LocalDate = string

/** An ISO 8601 UTC instant, e.g. "2026-08-08T18:00:00.000Z". */
export type Instant = string

// ── Enums (string unions matching Prisma) ───────────────────────────────────

export type ProblemSource = "LEETCODE" | "CUSTOM"

export type Difficulty = "EASY" | "MEDIUM" | "HARD" | "UNRATED"

export type PracticeState =
  | "SCHEDULED"
  | "DUE"
  | "OVERDUE"
  | "MASTERED"
  | "NEEDS_REINFORCEMENT"

/**
 * Six rungs, not five. `DAY_3` was added to the ladder — anything that
 * hard-codes a five-stage sequence is wrong. The reinforcement cycle after a
 * low-confidence `DAY_30` still restarts at `DAY_7` and skips `DAY_3`.
 */
export type RevisionStage =
  | "DAY_0"
  | "DAY_1"
  | "DAY_3"
  | "DAY_7"
  | "DAY_15"
  | "DAY_30"

export type AttemptOutcome =
  | "SOLVED_INDEPENDENTLY"
  | "SOLVED_WITH_HINT"
  | "VIEWED_SOLUTION"

export type RevisionEventType =
  | "CYCLE_STARTED"
  | "COMPLETED"
  | "ADVANCED"
  | "REPEATED"
  | "RESET"
  | "RESCHEDULED"
  | "MASTERED"
  | "REINFORCEMENT_STARTED"

/** Stage order, for rendering the timeline left to right. */
export const REVISION_STAGES: readonly RevisionStage[] = [
  "DAY_0",
  "DAY_1",
  "DAY_3",
  "DAY_7",
  "DAY_15",
  "DAY_30",
]

/** The four fields `GET /api/search` can be scoped to. */
export type SearchScope = "problem" | "recall" | "attempt" | "vocabulary"

/**
 * Difficulty in the backend's enum order — this is the order `sortBy=difficulty`
 * uses, which is not alphabetical.
 */
export const DIFFICULTY_ORDER: readonly Difficulty[] = [
  "EASY",
  "MEDIUM",
  "HARD",
  "UNRATED",
]

// ── Envelope ────────────────────────────────────────────────────────────────

export type ApiMeta = {
  page: number
  limit: number
  total: number
  totalPages?: number
  /**
   * Only on bounded listings (search). True when the candidate cap stopped the
   * scan short — `total` is then the capped count, not the library-wide total.
   */
  truncated?: boolean
}

export type ApiEnvelope<T> = {
  success: true
  statusCode: number
  message?: string
  meta?: ApiMeta
  data: T
}

export type ApiErrorIssue = { path: string; message: string }

/**
 * The error envelope is a different shape from the success envelope, and
 * notably carries no `statusCode` — read the status from the HTTP response.
 */
export type ApiErrorBody = {
  success: false
  message: string
  errorMessage?: string
  errorDetails?: { issues?: ApiErrorIssue[] } & Record<string, unknown>
  stack?: string
}

// ── Auth & user ─────────────────────────────────────────────────────────────

export type AuthTokens = { accessToken: string; refreshToken: string }

export type Owner = {
  id: string
  name: string
  email: string
  lastActiveAt: Instant | null
  createdAt: Instant
  updatedAt: Instant
}

export type Profile = {
  id: string
  userId: string
  profilePhoto: string | null
  bio: string | null
  createdAt: Instant
  updatedAt: Instant
}

/** Returned by `PUT /api/users/my-profile` — `Owner` plus the profile relation. */
export type OwnerWithProfile = Owner & { profile: Profile | null }

// ── Problems ────────────────────────────────────────────────────────────────

export type TopicRef = { slug: string; name: string }

/**
 * Structurally identical to `TopicRef`, deliberately a distinct type.
 *
 * A *topic* says what a problem is **about** and is imported from LeetCode. A
 * *pattern* says **how the owner solves it** and is authored by hand, only ever
 * through a recall card. Two vocabularies, two endpoints — keeping the types
 * apart is what stops a topic slug being passed to a pattern filter.
 */
export type PatternRef = { slug: string; name: string }

export type Problem = {
  id: string
  source: ProblemSource
  title: string
  /** Set for LEETCODE problems, always `https://leetcode.com/problems/<slug>/`. */
  canonicalUrl: string | null
  /** Free-text origin for CUSTOM problems, e.g. "Cracking the Coding Interview". */
  sourceName: string | null
  sourceUrl: string | null
  difficulty: Difficulty
  statement: string | null
  /** True once any attempt on this problem had outcome VIEWED_SOLUTION. */
  solutionViewed: boolean
  metadataEnteredManually: boolean
  topics: TopicRef[]
  /**
   * Owner-authored techniques, assigned only through the recall card. Empty
   * when the problem has no card. `POST`/`PATCH /api/problems` silently ignore
   * a `patterns` field.
   */
  patterns: PatternRef[]
  hasRecallCard: boolean
  /**
   * Derived per read, like `practiceState`: true when a `VIEWED_SOLUTION`
   * attempt is newer than the card's `updatedAt` — the owner had to look the
   * answer up after writing their notes. Never recompute or persist it.
   */
  needsRecallUpdate: boolean
  /** null until the first attempt starts a cycle. */
  currentStage: RevisionStage | null
  nextDueDate: LocalDate | null
  nextDueAt: Instant | null
  /** Re-derived per read; null until the first attempt. Never recompute this. */
  practiceState: PracticeState | null
  attemptCount: number
  createdAt: Instant
  updatedAt: Instant
}

export type TimelineEntry = {
  stage: RevisionStage
  date: LocalDate | null
  status: "completed" | "current" | "upcoming"
}

export type Attempt = {
  id: string
  userId: string
  problemId: string
  outcome: AttemptOutcome
  durationMinutes: number
  confidence: number
  notes: string | null
  attemptedAt: Instant
  createdAt: Instant
  updatedAt: Instant
}

/**
 * The revision log is rewritten on every schedule replay, so `id` is NOT stable
 * across writes. Key rendered lists by `type + createdAt`, never by `id`.
 */
export type RevisionEvent = {
  id: string
  userId: string
  problemId: string
  type: RevisionEventType
  stage: RevisionStage | null
  fromDueAt: Instant | null
  toDueAt: Instant | null
  reason: string | null
  createdAt: Instant
}

/**
 * The card as embedded in the problem detail response.
 *
 * It carries neither `patterns` nor `needsRecallUpdate` — both sit at the top
 * level of the problem, because both are also present on every listing row.
 */
export type EmbeddedRecallCard = {
  keyInsight: string
  approach: string | null
  pitfalls: string | null
  timeComplexity: string | null
  spaceComplexity: string | null
  createdAt: Instant
  updatedAt: Instant
}

export type ProblemDetail = Problem & {
  anchorDate: LocalDate | null
  /** Newest first. */
  attempts: Attempt[]
  /** Newest first. */
  revisions: RevisionEvent[]
  /** All 6 stages once a cycle exists; empty array otherwise. */
  timeline: TimelineEntry[]
  cycleStartsOnFirstAttempt: boolean
  /** Explicitly `null` when there is no card — never omitted. */
  recallCard: EmbeddedRecallCard | null
}

/** `alreadyExisted: true` arrives with HTTP 200 and is a success, not an error. */
export type ProblemCreated = Problem & { alreadyExisted: boolean }

export type ProblemPreview = {
  canonicalUrl: string
  title: string
  difficulty: Difficulty
  topics: string[]
  /** Non-null when this URL is already in the library — link to it instead. */
  existingProblemId: string | null
}

// ── Schedule deltas returned by attempt / reschedule mutations ──────────────

export type ScheduleDelta = {
  currentStage: RevisionStage | null
  nextDueDate: LocalDate | null
  practiceState: PracticeState | null
}

export type AttemptCreated = ScheduleDelta & {
  attempt: Attempt
  solutionViewed: boolean
}

export type AttemptUpdated = ScheduleDelta & { attempt: Attempt }

export type AttemptDeleted = ScheduleDelta & { id: string; problemId: string }

export type RescheduleResult = {
  currentStage: RevisionStage | null
  dueDate: LocalDate | null
  anchorDate: LocalDate | null
  practiceState: PracticeState | null
  timeline: TimelineEntry[]
}

// ── Topics ──────────────────────────────────────────────────────────────────

export type TopicWithCount = {
  id: string
  slug: string
  name: string
  problemCount: number
}

export type Topic = {
  id: string
  slug: string
  name: string
  createdAt: Instant
  updatedAt: Instant
}

// ── Patterns ────────────────────────────────────────────────────────────────
// The same shapes as topics over a separate vocabulary with separate endpoints.
// Patterns have no create and no delete: one appears when a card first names
// it, and is left behind with `problemCount: 0` when the last card drops it.

export type PatternWithCount = {
  id: string
  slug: string
  name: string
  problemCount: number
}

export type Pattern = {
  id: string
  slug: string
  name: string
  createdAt: Instant
  updatedAt: Instant
}

// ── Recall cards ────────────────────────────────────────────────────────────

/**
 * The body of `PUT /api/problems/:id/recall`.
 *
 * This is a `PUT`, not a `PATCH`: every omitted field is **cleared**, and an
 * omitted `patterns` list wipes the problem's patterns. Always build this from
 * the card's current values, never from just the fields the owner touched.
 */
export type RecallCardInput = {
  keyInsight: string
  approach?: string | null
  pitfalls?: string | null
  timeComplexity?: string | null
  spaceComplexity?: string | null
  /** Pattern **display names**, not slugs. Replaces the whole set. */
  patterns?: string[]
}

/** Returned by `GET` and `PUT` on the card endpoint. */
export type RecallCard = {
  keyInsight: string
  approach: string | null
  pitfalls: string | null
  timeComplexity: string | null
  spaceComplexity: string | null
  patterns: PatternRef[]
  needsRecallUpdate: boolean
  createdAt: Instant
  updatedAt: Instant
}

export type RecallSheetEntry = {
  problemId: string
  title: string
  difficulty: Difficulty
  practiceState: PracticeState | null
  keyInsight: string
  timeComplexity: string | null
  spaceComplexity: string | null
  needsRecallUpdate: boolean
}

export type RecallSheetGroup = {
  /** `null` for the trailing "Untagged" group — it has no pattern page. */
  slug: string | null
  name: string
  cards: RecallSheetEntry[]
}

export type RecallSheet = {
  /** Most-populated pattern first; the untagged group, if any, is always last. */
  groups: RecallSheetGroup[]
  /**
   * Distinct cards returned — **not** the sum of group sizes. A card tagged
   * with two patterns appears in two groups but counts once here.
   */
  totalCards: number
  /** True when the server's card cap stopped the scan short. */
  truncated: boolean
}

// ── Search ──────────────────────────────────────────────────────────────────

/** Declaration order is also the ranking priority the backend sorts by. */
export type SearchField =
  | "title"
  | "pattern"
  | "topic"
  | "keyInsight"
  | "approach"
  | "pitfalls"
  | "statement"
  | "attemptNote"

export type SearchMatch = {
  field: SearchField
  /** Plain text with `…` where it was cut. Escape before rendering. */
  snippet: string
  /** Present only when `field === "attemptNote"`. */
  attemptedAt?: Instant
}

export type SearchResult = {
  id: string
  title: string
  source: ProblemSource
  difficulty: Difficulty
  practiceState: PracticeState | null
  topics: TopicRef[]
  patterns: PatternRef[]
  /** Never empty — a result with no attributable match is dropped. */
  matches: SearchMatch[]
}

// ── Dashboard ───────────────────────────────────────────────────────────────

export type DueItem = {
  id: string
  title: string
  source: ProblemSource
  difficulty: Difficulty
  topics: TopicRef[]
  stage: RevisionStage | null
  dueDate: LocalDate | null
  /** 0 when due today; positive when overdue. Never compute this client-side. */
  daysOverdue: number
  solutionViewed: boolean
  practiceState: PracticeState | null
}

export type TodayDashboard = {
  date: LocalDate
  timezone: string
  dueCount: number
  overdueCount: number
  /** Everything due today or earlier, most overdue first. */
  due: DueItem[]
  /** The first 5 of `due` — a workload suggestion, not a disjoint set. */
  recommended: DueItem[]
  streak: number
  /** Exactly 7 entries, starting tomorrow. Days with nothing due have count 0. */
  upcoming: UpcomingDay[]
}

export type UpcomingDay = { date: LocalDate; count: number }

// ── Insights ────────────────────────────────────────────────────────────────

export type DateRange = { from: LocalDate | null; to: LocalDate | null }

export type InsightsSummary = {
  range: DateRange
  timezone: string
  problemsAdded: number
  problemsAttempted: number
  solvedIndependently: number
  /** A current total, not a figure for the selected range. */
  mastered: number
  revisionCompletion: {
    completedOnTime: number
    dueTotal: number
    /** Percentage 0–100, or null when nothing has come due yet. */
    rate: number | null
  }
  averageSolveTime: {
    firstAttempt: { averageMinutes: number | null; count: number }
    revision: { averageMinutes: number | null; count: number }
  }
  /**
   * Lifetime figures — **never** windowed by `range`. Do not label this block
   * with the selected date range.
   */
  recallCoverage: {
    /** Problems with at least one attempt: the denominator. */
    attemptedProblems: number
    withCard: number
    needsUpdate: number
    /** Percentage 0–100, or null when nothing has been attempted. */
    rate: number | null
  }
}

export type TopicInsight = {
  id: string
  slug: string
  name: string
  problemCount: number
  attemptCount: number
  /** Already a percentage 0–100 — do not multiply by 100. Null when no attempts. */
  independentSolveRate: number | null
  averageConfidence: number | null
  averageMinutes: number | null
  weak: boolean
}

export type InsightThresholds = {
  minAttempts: number
  solveRate: number
  confidence: number
}

export type TopicInsights = {
  topics: TopicInsight[]
  /** Subset of `topics` where `weak === true`, worst first. */
  weakTopics: TopicInsight[]
  thresholds: InsightThresholds
}

/** Identical shape to `TopicInsight`, over techniques instead of subjects. */
export type PatternInsight = TopicInsight

export type PatternInsights = {
  patterns: PatternInsight[]
  /** Subset of `patterns` where `weak === true`, worst first. */
  weakPatterns: PatternInsight[]
  /** The same configured thresholds topic insights use. */
  thresholds: InsightThresholds
}

export type ActivityDay = { date: LocalDate; count: number }

export type ActivityInsights = {
  range: { from: LocalDate; to: LocalDate }
  timezone: string
  /** One entry per day in the range, gaps already filled with count 0. */
  days: ActivityDay[]
}

export type BacklogPoint = { date: LocalDate; overdueCount: number }

export type BacklogInsights = {
  range: { from: LocalDate; to: LocalDate }
  timezone: string
  /** The current total, distinct from the end-of-day `trend` series. */
  overdueCount: number
  trend: BacklogPoint[]
}

// ── Settings & reminders ────────────────────────────────────────────────────

export type UserSettings = {
  id: string
  userId: string
  /** IANA identifier, e.g. "Asia/Dhaka". Governs every local-day computation. */
  timezone: string
  notificationsEnabled: boolean
  /** 24-hour, zero-padded "HH:mm". */
  reminderTime: string
  lastAcknowledgedDate: LocalDate | null
  createdAt: Instant
  updatedAt: Instant
}

export type ReminderNotification = {
  title: string
  body: string
  targetPath: string
}

export type ReminderState = {
  active: boolean
  localDate: LocalDate
  timezone: string
  reminderTime: string
  notificationsEnabled: boolean
  dueTomorrow: number
  dueToday: number
  overdueToday: number
  acknowledged: boolean
  notification: ReminderNotification
}
