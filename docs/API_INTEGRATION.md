# ReSolve API — Frontend Integration Guide (Next.js App Router)

This document is the complete contract between the ReSolve backend (Express 5 + Prisma) and a
Next.js frontend. It is written to be read by a human **or** an AI coding agent implementing the
frontend: every endpoint states its purpose, exact behaviour, exact input, exact output, its error
cases, and the recommended Next.js pattern for calling it.

- **Backend base URL:** `http://localhost:6000` in dev (whatever `PORT` is set to). Every route is
  under `/api`.
- **Everything below `/api/auth` requires authentication.** There are no public data endpoints.
- **ReSolve is a single-user application.** There is no registration, no roles, no user list. The
  owner account is seeded server-side. The frontend never needs tenant scoping or permission checks
  — if the request is authenticated, the data returned is the owner's.

---

## Table of contents

1. [Core concepts you must understand first](#1-core-concepts-you-must-understand-first)
2. [Response envelope and error shape](#2-response-envelope-and-error-shape)
3. [Authentication model](#3-authentication-model)
4. [Recommended Next.js architecture](#4-recommended-nextjs-architecture)
5. [Shared TypeScript types](#5-shared-typescript-types)
6. [The API client](#6-the-api-client)
7. [Caching and revalidation strategy](#7-caching-and-revalidation-strategy)
8. [Endpoint reference](#8-endpoint-reference)
   - [8.1 Auth](#81-auth)
   - [8.2 User](#82-user)
   - [8.3 Problems](#83-problems)
   - [8.4 Attempts](#84-attempts)
   - [8.5 Revisions](#85-revisions)
   - [8.6 Topics](#86-topics)
   - [8.7 Dashboard](#87-dashboard)
   - [8.8 Insights](#88-insights)
   - [8.9 Settings](#89-settings)
   - [8.10 Reminders](#810-reminders)
   - [8.11 Recall cards](#811-recall-cards)
   - [8.12 Patterns](#812-patterns)
   - [8.13 Search](#813-search)
9. [Suggested frontend folder structure](#9-suggested-frontend-folder-structure)
10. [Gotchas checklist](#10-gotchas-checklist)

---

## 1. Core concepts you must understand first

Read this section before writing any UI. Most integration bugs in this API come from misunderstanding
these five ideas.

### 1.1 Local dates vs instants

The API uses **two different date representations** and they are not interchangeable.

| Shape       | Type                    | Example                      | Meaning                                                                                                |
| ----------- | ----------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------ |
| `LocalDate` | `string` (`yyyy-MM-dd`) | `"2026-08-08"`               | A calendar day in the **owner's configured timezone**. Sorts and compares correctly as a plain string. |
| Instant     | ISO 8601 string         | `"2026-08-08T18:00:00.000Z"` | A UTC point in time, serialized by `JSON.stringify(new Date())`.                                       |

Fields ending in `Date` (`nextDueDate`, `dueDate`, `anchorDate`, `localDate`, `date`) are `LocalDate`
strings. Fields ending in `At` (`nextDueAt`, `attemptedAt`, `createdAt`, `updatedAt`, `fromDueAt`,
`toDueAt`) are instants.

**Rules for the frontend:**

- **Never** run `new Date("2026-08-08")` on a `LocalDate` and format it with the browser's locale —
  that parses as UTC midnight and will render as the previous day for anyone west of UTC. Render
  `LocalDate` strings by splitting them, or with a date library in `UTC` mode, or by using
  `formatInTimeZone` against the timezone from the API.
- **Never** compute "days until due" by subtracting instants. The backend already gives you
  `daysOverdue` on the dashboard, and `LocalDate` strings can be compared lexicographically
  (`a < b`, `a === b`) to answer overdue/due/future.
- The owner's timezone is returned on the dashboard (`timezone`), insights, reminder, and settings
  responses. Use it, not `Intl.DateTimeFormat().resolvedOptions().timeZone`.

### 1.2 Practice state is derived, not stored

`practiceState` on a problem is **re-derived on every read** from `nextDueAt` against today in the
owner's timezone:

- `nextDueDate < today` → `OVERDUE`
- `nextDueDate === today` → `DUE`
- `nextDueDate > today` → `SCHEDULED`
- `MASTERED` and `NEEDS_REINFORCEMENT` are terminal and override the above.
- `practiceState` is `null` when the problem has **never been attempted** — it has no revision cycle
  yet.

The frontend should therefore treat `practiceState` as authoritative for display and must **not**
recompute it. It should also not cache a problem list across a local-midnight boundary and expect the
badges to still be right (see [§7](#7-caching-and-revalidation-strategy)).

### 1.3 The revision engine is replay-based

Every write that touches attempts (`create`, `update`, `delete`) or reschedules causes the backend to
**recompute the entire schedule from the problem's full attempt history** inside one transaction.
Consequences for the UI:

- Editing an old attempt can change `currentStage`, `nextDueDate`, and `practiceState`. The mutation
  responses return the new schedule fields so you can update the UI without a second request.
- Deleting the **last** attempt removes the revision cycle entirely: `currentStage`, `nextDueDate`
  and `practiceState` all come back `null`.
- The revision event log is rewritten on every replay, so event `id`s are **not stable** across
  writes. Do not use a `RevisionEvent.id` as a persistent client key across refetches; use the array
  index or `type + createdAt`.

### 1.4 Stage arithmetic (for rendering the timeline)

Stages are `DAY_0 → DAY_1 → DAY_3 → DAY_7 → DAY_15 → DAY_30`. Offsets from the cycle anchor are
`0 / 1 / 3 / 7 / 15 / 30` days, and the step lengths _into_ each stage — the gap from the previous
rung, used when anchor-relative arithmetic would land in the past — are `0 / 1 / 2 / 4 / 8 / 15`.
A `SOLVED_WITH_HINT` outcome repeats the current stage; a
`SOLVED_INDEPENDENTLY` advances; a `VIEWED_SOLUTION` resets the cycle and re-anchors at any stage
(including after mastery). The frontend does not implement any of this — it renders `timeline`,
`currentStage`, and `nextDueDate` as given.

> **Changed:** `DAY_3` was added to the ladder. It is a **six**-stage sequence now — anything that
> hard-codes five stages, or a `RevisionStage` union without `'DAY_3'`, needs updating. Existing
> problems were replayed onto the new ladder when this shipped, so their `nextDueDate` and
> `currentStage` moved; discard any cached schedule data from before that point. Note also that the
> reinforcement cycle after a low-confidence `DAY_30` still restarts at `DAY_7` and skips `DAY_3`.

### 1.5 Recall cards are knowledge; attempts are history

The **recall layer** ([§8.11](#811-recall-cards)–[§8.13](#813-search)) stores what the owner *learned*,
as opposed to the attempt log's record of what they *did*. The distinction drives several API rules
that are otherwise surprising:

- **A recall card never affects scheduling.** Writing, editing, or deleting a card leaves
  `currentStage`, `nextDueDate`, and `practiceState` untouched, and emits no revision event. Card
  mutations therefore do **not** need to invalidate the dashboard.
- **A card is one-per-problem and replaced wholesale.** `PUT /api/problems/:id/recall` is a `PUT`, not
  a `PATCH`: any field you omit is **cleared**, and an omitted `patterns` list clears the problem's
  patterns. Always send the full card, pre-filled from the current values, when editing.
- **Topics ≠ patterns.** A *topic* says what a problem is **about** (`array`, `string`) and is imported
  from LeetCode metadata. A *pattern* says **how the owner solves it** (`monotonic-stack`,
  `binary-search-on-answer`) and is authored by the owner. They are separate vocabularies with separate
  endpoints. Patterns are assigned **only** through the recall card — sending `patterns` to
  `POST`/`PATCH /api/problems` is silently ignored.
- **`needsRecallUpdate` is derived per read**, like `practiceState`. It is `true` when a
  `VIEWED_SOLUTION` attempt is **newer** than the card's `updatedAt` — i.e. the owner had to look the
  answer up after writing their notes, so the card is known to be incomplete. It clears when the card
  is saved again (even with identical text, because `updatedAt` moves) or when the offending attempt
  is deleted. It is always `false` for a problem with no card.

---

## 2. Response envelope and error shape

### 2.1 Success envelope

Every successful response has this shape (produced by `sendResponse`):

```jsonc
{
  "success": true,
  "statusCode": 200,
  "message": "Problems retrieved successfully",
  "meta": {
    // present only on paginated list endpoints
    "page": 1,
    "limit": 20,
    "total": 137,
    "totalPages": 7,
  },
  "data": {/* endpoint-specific payload */},
}
```

`meta` is `undefined` (omitted) on non-paginated endpoints. `data` is always present; it may be
`null` (logout) or an array.

### 2.2 Error envelope

Errors are produced by the global error handler and have a **different shape** — note there is
**no `statusCode` field in the error body**; read the status from the HTTP response.

```jsonc
{
  "success": false,
  "message": "Human-readable summary",
  "errorMessage": "…", // present on Prisma-mapped errors (duplicate, cast, not-found, FK)
  "errorDetails": {}, // structure varies by error class — see below
  "stack": "…", // only when the API runs with NODE_ENV=development
}
```

| Trigger                                | HTTP                        | `message`                                                                       | `errorDetails`                                                                                |
| -------------------------------------- | --------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Zod validation failure (body or query) | `400`                       | Concatenated issue list, e.g. `"Confidence Confidence Must Be Between 1 And 5"` | `{ issues: [{ path, message }] }`                                                             |
| `AppError` thrown by a service         | its status                  | the thrown message                                                              | the `AppError` instance; may carry extra keys (e.g. `canonicalUrl` on a 422 metadata failure) |
| Missing / invalid / expired JWT        | `401`                       | `"You are not authorized"`                                                      | —                                                                                             |
| Prisma `P2025` (record not found)      | `404`                       | `"Record not found"`                                                            | Prisma error                                                                                  |
| Prisma `P2002` (unique violation)      | `400`                       | duplicate-field message                                                         | Prisma error                                                                                  |
| Prisma `P2023` (malformed id)          | `400`                       | cast message                                                                    | Prisma error                                                                                  |
| Prisma `P2003` (FK violation)          | `400`                       | `"Foreign key constraint failed"`                                               | Prisma error                                                                                  |
| Unknown route                          | `404`                       | `"API Not Found!"`                                                              | body also has `path` and `date`                                                               |
| Anything else                          | `500` (or `err.statusCode`) | `"Something went wrong!"`                                                       | the error                                                                                     |

> **Important for form UIs:** the Zod `message` is a machine-concatenated, Title-Cased string and is
> not good UX. For field-level errors, read `errorDetails.issues[]`, which gives you
> `{ path: "Confidence", message: "Confidence Must Be Between 1 And 5" }`. `path` is the **last**
> segment of the Zod path, Title-Cased — lowercase it to map back to your form field name.

---

## 3. Authentication model

### 3.1 How the backend authenticates a request

`src/middlewares/auth.ts`:

1. Reads `req.headers.authorization`.
2. **The header value is the raw JWT with no `Bearer ` prefix.**
   ✅ `Authorization: eyJhbGciOi...`
   ❌ `Authorization: Bearer eyJhbGciOi...` → JWT verification fails → `401`.
3. Verifies the token against `JWT_ACCESS_SECRET`.
4. Re-checks that the user still exists in the database (a token for a deleted user is rejected).
5. Writes `lastActiveAt = now()` on the user row — **every authenticated request, including GETs, is
   a database write.** This is why you should not hammer the API with polling.
6. Populates `req.user` with `{ id, name, email }` from the token payload.

### 3.2 Tokens and cookies

`POST /api/auth/login` does two things at once:

- Returns `{ accessToken, refreshToken }` in the JSON body.
- Sets `accessToken` and `refreshToken` as **httpOnly cookies** on the API's own domain, with
  `sameSite: 'none'`, `secure: false`, `path: '/'`. Access cookie `maxAge` 1 hour, refresh cookie 7
  days.

`POST /api/auth/refresh-token` reads the `refreshToken` **cookie** (not the body, not a header),
validates it against the `refresh_tokens` table, and **rotates** it: the old row is deleted and a new
one created in a single transaction. It returns a fresh `{ accessToken, refreshToken }` pair and sets
both cookies again.

`POST /api/auth/logout` reads the `refreshToken` cookie, deletes the row, and clears both cookies.

> ⚠️ **Do not rely on the API's own cookies from the browser.** They are set with
> `SameSite=None; Secure=false`, a combination modern browsers reject outright. Cross-origin cookie
> auth from a browser to this API will not work reliably. Additionally, CORS is locked to
> `origin: process.env.APP_URL` with `credentials: true`, so a mismatched `APP_URL` breaks all
> browser calls.
>
> **The supported and recommended integration is server-side:** Next.js holds the tokens in its own
> first-party httpOnly cookies and talks to the API from the server with an `Authorization` header.
> The browser never sees a token and never talks to the ReSolve API directly.

### 3.3 Token lifetimes

Driven by `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` on the API. The cookie `maxAge` values
imply 1 hour and 7 days. Design the frontend to refresh proactively rather than reactively — because
rotation means a `401` retry loop from a Server Component cannot write the new cookie (Server
Components cannot set cookies). See [§4.3](#43-token-refresh-in-proxyts).

---

## 4. Recommended Next.js architecture

Target: **Next.js 16 App Router** (patterns for 15 noted where they differ).

```
Browser ──▶ Next.js server ──(Authorization: <jwt>)──▶ ReSolve API
   ▲              │
   └── httpOnly ──┘   Next.js owns the session cookies; the API token
       cookies        never reaches client JavaScript.
```

### 4.1 Which primitive for which job

| Job                                                                        | Use                                                                                                 | Why                                                                                                    |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Render a page from API data (dashboard, library, problem detail, insights) | **Server Component**, `await` the API directly                                                      | No client waterfall, token stays server-side, no API layer of your own to maintain                     |
| Any mutation (log attempt, capture problem, update settings, reschedule)   | **Server Action**                                                                                   | End-to-end type safety, progressive enhancement, integrates with `useActionState` and `revalidatePath` |
| Login / logout                                                             | **Route Handler** or **Server Action**                                                              | Both can write cookies. A Server Action is fine and gives you `useActionState` for free                |
| Typeahead / live filtering that must not full-page-navigate                | Client Component calling a **Server Action**, or `useSearchParams` + server rendering               | Prefer URL state for filters so the library page stays shareable and cacheable                         |
| Reading the reminder state periodically                                    | Server Component + `router.refresh()` on an interval, **or** a small Route Handler the client polls | Remember §3.1: every call writes `lastActiveAt`. Poll at minutes, not seconds                          |

**Never** call the ReSolve API directly from a Client Component — that would require shipping the
access token to the browser.

### 4.2 Environment variables

```bash
# .env.local (Next.js)
API_BASE_URL=http://localhost:5000        # server-only, NOT NEXT_PUBLIC_
```

Do not prefix with `NEXT_PUBLIC_`. The browser has no business knowing the API's address, because it
never calls it.

On the API side, `APP_URL` must equal your Next.js origin (e.g. `http://localhost:3000`) or CORS will
reject any stray browser call.

### 4.3 Token refresh in `proxy.ts`

Refresh must happen where cookies can be written. In the App Router that means a Route Handler, a
Server Action, or the proxy (middleware). The proxy is the right place because it runs before
rendering, so every Server Component below it sees a valid token.

**Next.js 16** — file `proxy.ts` at the project root, exporting `proxy` and `proxyConfig`:

```ts
// proxy.ts
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login']
// Refresh when the access token has under 5 minutes left.
const REFRESH_SKEW_MS = 5 * 60 * 1000

function expiresAt(jwt: string): number {
  try {
    const payload = JSON.parse(
      Buffer.from(jwt.split('.')[1] ?? '', 'base64url').toString(),
    ) as { exp?: number }
    return (payload.exp ?? 0) * 1000
  } catch {
    return 0
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p)))
    return NextResponse.next()

  const accessToken = request.cookies.get('resolve_access')?.value
  const refreshToken = request.cookies.get('resolve_refresh')?.value

  if (!accessToken && !refreshToken) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const needsRefresh =
    !accessToken || expiresAt(accessToken) - Date.now() < REFRESH_SKEW_MS

  if (!needsRefresh) return NextResponse.next()
  if (!refreshToken)
    return NextResponse.redirect(new URL('/login', request.url))

  // The API reads the refresh token from its OWN cookie name, so send it as a Cookie header.
  const res = await fetch(
    `${process.env.API_BASE_URL}/api/auth/refresh-token`,
    {
      method: 'POST',
      headers: { cookie: `refreshToken=${refreshToken}` },
      cache: 'no-store',
    },
  )

  if (!res.ok) {
    const redirect = NextResponse.redirect(new URL('/login', request.url))
    redirect.cookies.delete('resolve_access')
    redirect.cookies.delete('resolve_refresh')
    return redirect
  }

  const { data } = (await res.json()) as {
    data: { accessToken: string; refreshToken: string }
  }

  const next = NextResponse.next()
  // Rewrite the request cookie so THIS render already sees the new token.
  next.cookies.set('resolve_access', data.accessToken, sessionCookie(60 * 60))
  next.cookies.set(
    'resolve_refresh',
    data.refreshToken,
    sessionCookie(60 * 60 * 24 * 7),
  )
  return next
}

function sessionCookie(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  }
}

export const proxyConfig = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|login).*)'],
}
```

**Next.js 15** — identical body, but the file is `middleware.ts`, the export is `middleware`, and
the config export is `config`. Run `npx @next/codemod@latest upgrade` when moving to 16.

> The refresh token is **rotated**, so two concurrent refreshes will race and one will lose (the
> loser's token row is already deleted → `401`). Doing refresh only in the proxy, which runs once per
> navigation, avoids this. Do not also add refresh-on-401 retry inside the fetch client.

---

## 5. Shared TypeScript types

Put these in `lib/api/types.ts`. They mirror the backend's Prisma enums and presenter shapes exactly.

```ts
// ── Primitives ──────────────────────────────────────────────────────────────
/** A calendar day in the owner's timezone, `yyyy-MM-dd`. Sorts as a string. */
export type LocalDate = string
/** An ISO 8601 UTC instant, e.g. "2026-08-08T18:00:00.000Z". */
export type Instant = string

// ── Enums (string unions matching Prisma) ───────────────────────────────────
export type ProblemSource = 'LEETCODE' | 'CUSTOM'
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'UNRATED'
export type PracticeState =
  'SCHEDULED' | 'DUE' | 'OVERDUE' | 'MASTERED' | 'NEEDS_REINFORCEMENT'
export type RevisionStage =
  'DAY_0' | 'DAY_1' | 'DAY_3' | 'DAY_7' | 'DAY_15' | 'DAY_30'
export type AttemptOutcome =
  'SOLVED_INDEPENDENTLY' | 'SOLVED_WITH_HINT' | 'VIEWED_SOLUTION'
export type RevisionEventType =
  | 'CYCLE_STARTED'
  | 'COMPLETED'
  | 'ADVANCED'
  | 'REPEATED'
  | 'RESET'
  | 'RESCHEDULED'
  | 'MASTERED'
  | 'REINFORCEMENT_STARTED'

// ── Envelope ────────────────────────────────────────────────────────────────
export type ApiMeta = {
  page: number
  limit: number
  total: number
  totalPages?: number
  /** Only on bounded listings (search). True when a cap stopped the scan short. */
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

/** Returned by PUT /api/users/my-profile — same as Owner plus the profile relation. */
export type OwnerWithProfile = Owner & { profile: Profile | null }

// ── Problems ────────────────────────────────────────────────────────────────
export type TopicRef = { slug: string; name: string }
/** Same shape as TopicRef, deliberately a distinct type — see §1.5. */
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
  /** Owner-authored techniques, assigned through the recall card. Empty when no card. */
  patterns: PatternRef[]
  hasRecallCard: boolean
  /** Derived per read: a VIEWED_SOLUTION attempt is newer than the card. See §1.5. */
  needsRecallUpdate: boolean
  /** null until the first attempt starts a cycle. */
  currentStage: RevisionStage | null
  nextDueDate: LocalDate | null
  nextDueAt: Instant | null
  /** Re-derived per read; null until the first attempt. */
  practiceState: PracticeState | null
  attemptCount: number
  createdAt: Instant
  updatedAt: Instant
}

export type TimelineEntry = {
  stage: RevisionStage
  date: LocalDate | null
  status: 'completed' | 'current' | 'upcoming'
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
 * The card as embedded in the problem detail. Note it carries neither
 * `patterns` nor `needsRecallUpdate` — both live on the parent Problem.
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
  /** Explicitly null when the problem has no card — never omitted. */
  recallCard: EmbeddedRecallCard | null
}

export type ProblemCreated = Problem & { alreadyExisted: boolean }

export type ProblemPreview = {
  canonicalUrl: string
  title: string
  difficulty: Difficulty
  topics: string[]
  /** Non-null when this URL is already in the library — link to it instead of capturing. */
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
// Same shapes as topics, separate vocabulary and separate endpoints. See §1.5.
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
/** The request body for PUT /api/problems/:id/recall. Omitted fields are CLEARED. */
export type RecallCardInput = {
  keyInsight: string
  approach?: string | null
  pitfalls?: string | null
  timeComplexity?: string | null
  spaceComplexity?: string | null
  /** Replaces the problem's full pattern set. Omitting it clears all patterns. */
  patterns?: string[]
}

/** Returned by GET and PUT on the card endpoint. */
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
  /** null for the trailing "Untagged" group of cards with no pattern. */
  slug: string | null
  name: string
  cards: RecallSheetEntry[]
}

export type RecallSheet = {
  /** Most-populated pattern first; the untagged group, if any, is always last. */
  groups: RecallSheetGroup[]
  totalCards: number
  /** True when RECALL_SHEET_CAP (default 500) stopped the scan short. */
  truncated: boolean
}

// ── Search ──────────────────────────────────────────────────────────────────
export type SearchField =
  | 'title'
  | 'pattern'
  | 'topic'
  | 'keyInsight'
  | 'approach'
  | 'pitfalls'
  | 'statement'
  | 'attemptNote'

/** The order above is also the ranking priority — see §8.13. */
export type SearchMatch = {
  field: SearchField
  snippet: string
  /** Present only when `field === 'attemptNote'`. */
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

export type SearchScope = 'problem' | 'recall' | 'attempt' | 'vocabulary'

// ── Dashboard ───────────────────────────────────────────────────────────────
export type DueItem = {
  id: string
  title: string
  source: ProblemSource
  difficulty: Difficulty
  topics: TopicRef[]
  stage: RevisionStage | null
  dueDate: LocalDate | null
  /** 0 when due today; positive when overdue. */
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
  /** The first 5 of `due` — a workload suggestion, not a filter. */
  recommended: DueItem[]
  streak: number
  /** Exactly 7 entries, starting tomorrow. Days with nothing due have count 0. */
  upcoming: { date: LocalDate; count: number }[]
}

// ── Insights ────────────────────────────────────────────────────────────────
export type DateRange = { from: LocalDate | null; to: LocalDate | null }

export type InsightsSummary = {
  range: DateRange
  timezone: string
  problemsAdded: number
  problemsAttempted: number
  solvedIndependently: number
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
  /** Lifetime, never windowed by the range — see §8.8. */
  recallCoverage: {
    /** Problems with at least one attempt. The denominator. */
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
  /** Percentage 0–100, or null when there are no attempts. */
  independentSolveRate: number | null
  averageConfidence: number | null
  averageMinutes: number | null
  weak: boolean
}

export type TopicInsights = {
  topics: TopicInsight[]
  /** Subset of `topics` where `weak === true`, worst first. */
  weakTopics: TopicInsight[]
  thresholds: { minAttempts: number; solveRate: number; confidence: number }
}

/** Identical shape to TopicInsight, over patterns instead of topics. */
export type PatternInsight = TopicInsight

export type PatternInsights = {
  patterns: PatternInsight[]
  /** Subset of `patterns` where `weak === true`, worst first. */
  weakPatterns: PatternInsight[]
  /** The same configured thresholds topic insights use. */
  thresholds: { minAttempts: number; solveRate: number; confidence: number }
}

export type ActivityInsights = {
  range: { from: LocalDate; to: LocalDate }
  timezone: string
  /** One entry per day in the range, gaps filled with count 0. */
  days: { date: LocalDate; count: number }[]
}

export type BacklogInsights = {
  range: { from: LocalDate; to: LocalDate }
  timezone: string
  overdueCount: number
  trend: { date: LocalDate; overdueCount: number }[]
}

// ── Settings & reminders ────────────────────────────────────────────────────
export type UserSettings = {
  id: string
  userId: string
  /** IANA identifier, e.g. "Asia/Dhaka". Governs every local-day computation. */
  timezone: string
  notificationsEnabled: boolean
  /** 24-hour "HH:mm". */
  reminderTime: string
  lastAcknowledgedDate: LocalDate | null
  createdAt: Instant
  updatedAt: Instant
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
  notification: { title: string; body: string; targetPath: string }
}
```

---

## 6. The API client

One thin, typed wrapper. Server-only — importing it into a Client Component is a build error thanks
to `server-only`.

```ts
// lib/api/http.ts
import 'server-only'
import { cookies } from 'next/headers'
import type { ApiEnvelope, ApiErrorBody, ApiErrorIssue, ApiMeta } from './types'

const BASE_URL = process.env.API_BASE_URL

if (!BASE_URL) throw new Error('API_BASE_URL is not set')

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiErrorBody,
  ) {
    super(body.message ?? `Request failed with ${status}`)
    this.name = 'ApiError'
  }

  /** Zod issues mapped to lowercased field names, ready for form state. */
  get fieldErrors(): Record<string, string> {
    const issues: ApiErrorIssue[] = this.body.errorDetails?.issues ?? []
    return Object.fromEntries(
      issues.map((i) => [
        i.path.charAt(0).toLowerCase() + i.path.slice(1),
        i.message,
      ]),
    )
  }

  get isUnauthorized() {
    return this.status === 401
  }
  get isNotFound() {
    return this.status === 404
  }
  /** 422 = LeetCode metadata could not be resolved; fall back to manual entry. */
  get needsManualMetadata() {
    return this.status === 422
  }
  /** Echoed with the 422 so you can pre-fill the manual form. */
  get canonicalUrl(): string | undefined {
    return this.body.errorDetails?.canonicalUrl as string | undefined
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  /** Query params; undefined/null entries are dropped. */
  query?: Record<string, string | number | boolean | undefined | null>
  /** Defaults to 'no-store' — all ReSolve data is per-user and time-sensitive. */
  cache?: RequestCache
  tags?: string[]
}

export type ApiResult<T> = { data: T; meta?: ApiMeta; message?: string }

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResult<T>> {
  const { method = 'GET', body, query, cache = 'no-store', tags } = options

  const url = new URL(`${BASE_URL}${path}`)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  }

  const token = (await cookies()).get('resolve_access')?.value

  const response = await fetch(url, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      // NOTE: raw JWT — the API does NOT accept a "Bearer " prefix.
      ...(token ? { authorization: token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache,
    ...(tags ? { next: { tags } } : {}),
  })

  const payload = (await response.json().catch(() => null)) as
    ApiEnvelope<T> | ApiErrorBody | null

  if (!response.ok || !payload || payload.success === false) {
    throw new ApiError(
      response.status,
      (payload as ApiErrorBody) ?? { success: false, message: 'Network error' },
    )
  }

  return { data: payload.data, meta: payload.meta, message: payload.message }
}
```

### 6.1 Per-request deduplication

If two components on the same page need the same resource, wrap the reader in React's `cache()` so
the API is hit once per render pass:

```ts
// lib/api/problems.ts
import 'server-only'
import { cache } from 'react'
import { apiFetch } from './http'
import type { ProblemDetail } from './types'

export const getProblem = cache(async (id: string) => {
  const { data } = await apiFetch<ProblemDetail>(`/api/problems/${id}`)
  return data
})
```

`cache()` dedupes within a single request. It is **not** a persistent cache and does not survive
navigation — which is exactly what you want for per-user, time-sensitive data.

### 6.2 Mapping API errors to Next.js error primitives

```tsx
// app/(app)/problems/[id]/page.tsx
import { notFound } from 'next/navigation'
import { ApiError } from '@/lib/api/http'
import { getProblem } from '@/lib/api/problems'

export default async function ProblemPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let problem
  try {
    problem = await getProblem(id)
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) notFound()
    throw error // bubbles to the nearest error.tsx
  }

  return <ProblemDetailView problem={problem} />
}
```

Remember: `notFound()`, `redirect()`, `unauthorized()` throw control-flow exceptions. Call them
**outside** `try`/`catch`, or re-throw with `unstable_rethrow(error)`.

---

## 7. Caching and revalidation strategy

Every ReSolve response is (a) specific to the single owner, (b) derived from "today" in the owner's
timezone, and (c) served only when an `Authorization` header is present. That makes long-lived HTTP
caching actively wrong: a cached problem list goes stale at the owner's local midnight when every
`DUE` badge silently becomes `OVERDUE`.

**Default: `cache: 'no-store'` on every read** (the client wrapper above already does this), and rely
on Next.js's client-side Router Cache plus `revalidatePath` for freshness after mutations.

```ts
// lib/api/tags.ts
export const tags = {
  dashboard: 'dashboard',
  problems: 'problems',
  problem: (id: string) => `problem:${id}`,
  topics: 'topics',
  patterns: 'patterns',
  recall: (id: string) => `recall:${id}`,
  recallSheet: 'recall-sheet',
  insights: 'insights',
  settings: 'settings',
  reminder: 'reminder',
} as const
```

If you later opt into tagged caching for a specific view, pass `{ cache: 'force-cache', tags: [...] }`
to `apiFetch` and invalidate with `revalidateTag`. Otherwise, use path revalidation:

```ts
'use server'
import { revalidatePath } from 'next/cache'

// After any attempt/reschedule/problem mutation:
revalidatePath('/dashboard') // due counts, streak, recommended list
revalidatePath('/problems') // library listing badges
revalidatePath(`/problems/${id}`) // detail, timeline, event log
revalidatePath('/insights') // aggregates
```

**Which mutations invalidate what:**

| Mutation                         | Invalidate                                                              |
| -------------------------------- | ----------------------------------------------------------------------- |
| Create problem                   | `/problems`, `/insights`, `/topics` (new topics may have been created)  |
| Update problem                   | `/problems`, `/problems/[id]`, `/topics`                                |
| Delete problem                   | `/problems`, `/dashboard`, `/insights`, `/topics`                       |
| Create / update / delete attempt | `/problems`, `/problems/[id]`, `/dashboard`, `/insights` — a `VIEWED_SOLUTION` attempt also flips `needsRecallUpdate`, so refresh `/recall` too |
| Reschedule revision              | `/problems`, `/problems/[id]`, `/dashboard`, `/insights`                |
| Rename topic                     | `/topics`, `/problems`, `/insights` — a rename can **merge** two topics |
| Write / delete recall card       | `/problems`, `/problems/[id]`, `/recall`, `/patterns`, `/insights` — **not** `/dashboard`, cards never touch the schedule |
| Rename pattern                   | `/patterns`, `/problems`, `/recall`, `/insights` — a rename can **merge** two patterns |
| Update settings                  | everything; changing `timezone` re-derives every date in the product    |
| Acknowledge reminder             | `/dashboard` (or wherever the banner lives)                             |

Search results are never cached — they are a function of a user-typed query, so call
`/api/search` with `cache: 'no-store'` and debounce on the client instead.

For a page whose correctness depends on the local day (dashboard, library badges), also add
`export const dynamic = 'force-dynamic'` or simply accept `no-store` + the default 30 s client Router
Cache. If you want the badges to refresh without a navigation, call `router.refresh()` from a Client
Component on an interval or on `visibilitychange`.

---

## 8. Endpoint reference

Legend: **Auth** = whether `Authorization: <raw-jwt>` is required.

### 8.1 Auth

---

#### `POST /api/auth/login`

**Purpose.** Exchange the owner's email + password for an access/refresh token pair. This is the only
way into the application; there is no registration endpoint, and the owner account is created by the
backend's seed script.

**Auth.** No.

**Request body**

| Field      | Type     | Rules                         |
| ---------- | -------- | ----------------------------- |
| `email`    | `string` | must be a valid email address |
| `password` | `string` | non-empty                     |

```json
{ "email": "owner@example.com", "password": "hunter2" }
```

**Behaviour.** Looks up the user by email, `bcrypt.compare`s the password, signs an access token and
a refresh token over `{ id, name, email }`, persists the refresh token in `refresh_tokens` with a
7-day expiry, updates `lastActiveAt`, and sets both tokens as httpOnly cookies on the API domain
(which your Next.js server should ignore — store your own instead).

**Success `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "User logged in successfully",
  "data": { "accessToken": "eyJ...", "refreshToken": "eyJ..." }
}
```

**Errors**

| Status | Cause                                                                                                                                                                                        |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `400`  | Zod: missing/invalid email, empty password                                                                                                                                                   |
| `401`  | Password mismatch (`"Invalid Credentials"`)                                                                                                                                                  |
| `404`  | No user with that email — Prisma `findUniqueOrThrow` → `"Record not found"`. **Treat 404 and 401 identically in the UI** ("Invalid email or password") so you don't leak which emails exist. |

**Next.js usage** — a Server Action that writes your own session cookies:

```ts
// app/(auth)/login/actions.ts
'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ApiError, apiFetch } from '@/lib/api/http'
import type { AuthTokens } from '@/lib/api/types'

export type LoginState = {
  message?: string
  fieldErrors?: Record<string, string>
}

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  let tokens: AuthTokens
  try {
    const result = await apiFetch<AuthTokens>('/api/auth/login', {
      method: 'POST',
      body: {
        email: String(formData.get('email') ?? ''),
        password: String(formData.get('password') ?? ''),
      },
    })
    tokens = result.data
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401 || error.status === 404) {
        return { message: 'Invalid email or password.' }
      }
      return { message: error.message, fieldErrors: error.fieldErrors }
    }
    return { message: 'Could not reach the server. Try again.' }
  }

  const jar = await cookies()
  const base = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  }
  jar.set('resolve_access', tokens.accessToken, { ...base, maxAge: 60 * 60 })
  jar.set('resolve_refresh', tokens.refreshToken, {
    ...base,
    maxAge: 60 * 60 * 24 * 7,
  })

  redirect('/dashboard') // outside try/catch — redirect() throws by design
}
```

```tsx
// app/(auth)/login/login-form.tsx
'use client'

import { useActionState } from 'react'
import { login, type LoginState } from './actions'

const initialState: LoginState = {}

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState)

  return (
    <form action={formAction}>
      <label htmlFor="email">Email</label>
      <input
        id="email"
        name="email"
        type="email"
        required
        autoComplete="email"
      />

      <label htmlFor="password">Password</label>
      <input
        id="password"
        name="password"
        type="password"
        required
        autoComplete="current-password"
      />

      {state.message && (
        <p role="alert" aria-live="polite">
          {state.message}
        </p>
      )}
      <button disabled={pending}>{pending ? 'Signing in…' : 'Sign in'}</button>
    </form>
  )
}
```

---

#### `POST /api/auth/refresh-token`

**Purpose.** Rotate an expiring access token.

**Auth.** No `Authorization` header. The refresh token is read from the **`refreshToken` cookie** on
the request — so when calling from the Next.js server you must send it as a
`Cookie: refreshToken=<token>` header (see the proxy example in [§4.3](#43-token-refresh-in-proxyts)).

**Request body.** None.

**Behaviour.** Finds the token row, rejects it if missing or expired (deleting the expired row),
verifies the JWT signature against the refresh secret, re-signs a new pair, then **deletes the old
row and inserts a new one in one transaction** (rotation), and re-sets both cookies.

**Success `200`** — `data: { accessToken, refreshToken }`. Both are new; the old refresh token is
now dead.

**Errors**

| Status | Cause                                                                                                                                         |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `401`  | Token not in the database, expired, or signature invalid (`"Invalid or expired refresh token"`). Redirect to `/login` and clear your cookies. |
| `404`  | The token's user no longer exists.                                                                                                            |

**Next.js usage.** Only from `proxy.ts`/`middleware.ts`, exactly once per navigation. Because of
rotation, concurrent calls will make one of them fail — never call this from multiple places.

---

#### `POST /api/auth/logout`

**Purpose.** End the session and invalidate the stored refresh token.

**Auth.** No. Reads the `refreshToken` cookie; if absent it still succeeds.

**Behaviour.** Deletes matching rows from `refresh_tokens` and clears both API cookies. Always
returns `200`.

**Success `200`** — `data: null`, `message: "Logged out successfully"`.

**Next.js usage**

```ts
// app/(app)/logout/actions.ts
'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function logout() {
  const jar = await cookies()
  const refreshToken = jar.get('resolve_refresh')?.value

  if (refreshToken) {
    await fetch(`${process.env.API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { cookie: `refreshToken=${refreshToken}` },
      cache: 'no-store',
    }).catch(() => {}) // best-effort: clear local session regardless
  }

  jar.delete('resolve_access')
  jar.delete('resolve_refresh')
  redirect('/login')
}
```

---

### 8.2 User

---

#### `GET /api/users/me`

**Purpose.** The owner's account record — for the header avatar/name and the account settings page.

**Auth.** Yes.

**Input.** None.

**Behaviour.** Loads the user by the id in the JWT, omitting `password`. **The `profile` relation is
not included** in this response (unlike the update endpoint).

**Success `200`** — `data: Owner`:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "User profile retrieved successfully",
  "data": {
    "id": "b4f0…",
    "name": "Rakib",
    "email": "owner@example.com",
    "lastActiveAt": "2026-08-08T12:41:07.221Z",
    "createdAt": "2026-06-01T09:00:00.000Z",
    "updatedAt": "2026-08-08T12:41:07.221Z"
  }
}
```

**Errors.** `401` invalid/missing token; `404` if the user row was deleted.

---

#### `PUT /api/users/my-profile`

**Purpose.** Update the owner's name, email, avatar, or bio.

**Auth.** Yes. **Method is `PUT`, not `PATCH`** — but the semantics are partial-update; every field is
optional.

**Request body** (all optional, but send at least one)

| Field          | Type     | Rules       | Written to              |
| -------------- | -------- | ----------- | ----------------------- |
| `name`         | `string` | 2–100 chars | `users.name`            |
| `email`        | `string` | valid email | `users.email` (unique)  |
| `profilePhoto` | `string` | valid URL   | `profiles.profilePhoto` |
| `bio`          | `string` | ≤ 500 chars | `profiles.bio`          |

```json
{ "name": "Md Rakibul Hasan", "bio": "Grinding DSA one stage at a time." }
```

**Behaviour.** Updates the user row and performs a **nested `profile.update`** in the same call.

> ⚠️ The nested update is unconditional. If the owner has **no `Profile` row**, this endpoint fails
> with a Prisma `P2025` → `404 "Record not found"` even when you only sent `name`. Handle that case
> in the UI (surface a clear message rather than a generic 404), and note that the seed does not
> create a profile.

**Success `200`** — `data: OwnerWithProfile` (password omitted, `profile` relation included).

**Errors**

| Status | Cause                                                                    |
| ------ | ------------------------------------------------------------------------ |
| `400`  | Zod: name too short/long, invalid email, invalid photo URL, bio too long |
| `400`  | Prisma `P2002` if the new email is already taken                         |
| `401`  | Bad token                                                                |
| `404`  | User not found, or **no profile row exists** (see the warning above)     |

**Next.js usage** — Server Action + `useActionState`, revalidating the layout that renders the name:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { ApiError, apiFetch } from '@/lib/api/http'
import type { OwnerWithProfile } from '@/lib/api/types'

export type ProfileState = {
  ok?: boolean
  message?: string
  fieldErrors?: Record<string, string>
}

export async function updateProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const body = Object.fromEntries(
    (['name', 'email', 'profilePhoto', 'bio'] as const)
      .map((key) => [key, formData.get(key)?.toString().trim()])
      .filter(([, value]) => value), // omit empty strings so they aren't sent as ""
  )

  try {
    await apiFetch<OwnerWithProfile>('/api/users/my-profile', {
      method: 'PUT',
      body,
    })
  } catch (error) {
    if (error instanceof ApiError) {
      return { message: error.message, fieldErrors: error.fieldErrors }
    }
    throw error
  }

  revalidatePath('/', 'layout')
  return { ok: true, message: 'Profile updated.' }
}
```

---

### 8.3 Problems

---

#### `POST /api/problems/preview`

**Purpose.** Resolve a LeetCode URL into title/difficulty/topics **before** capturing it, so the
capture form can be pre-filled and the user can confirm. Also tells you whether the problem is
already in the library.

**Auth.** Yes.

**Request body**

| Field | Type     | Rules                                     |
| ----- | -------- | ----------------------------------------- |
| `url` | `string` | non-empty; must be a LeetCode problem URL |

Accepted URL forms — query strings and trailing segments (`/description`, `/solutions`) are stripped,
`www.` is stripped, host must be `leetcode.com`:

- `https://leetcode.com/problems/two-sum/`
- `https://leetcode.com/problems/two-sum/description/?envType=study-plan`
- `http://www.leetcode.com/problems/two-sum`

All canonicalize to `https://leetcode.com/problems/two-sum/`.

**Behaviour.**

1. Canonicalizes the URL (throws `400` if it isn't a LeetCode problem URL).
2. If a problem with that `canonicalUrl` already exists, returns **the stored metadata** plus
   `existingProblemId` — without calling LeetCode. This works even when LeetCode is unreachable.
3. Otherwise calls LeetCode's public GraphQL API with a timeout (`LEETCODE_METADATA_TIMEOUT_MS`,
   default 5000 ms) and returns the resolved metadata with `existingProblemId: null`.

**Success `200`** — `data: ProblemPreview`:

```json
{
  "canonicalUrl": "https://leetcode.com/problems/two-sum/",
  "title": "Two Sum",
  "difficulty": "EASY",
  "topics": ["Array", "Hash Table"],
  "existingProblemId": null
}
```

**Errors**

| Status | Cause                                                                                                                        | UI response                                                                                                                 |
| ------ | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `400`  | Not a LeetCode problem URL                                                                                                   | Inline field error on the URL input                                                                                         |
| `422`  | Metadata could not be resolved (LeetCode down, timeout, unknown slug). `errorDetails.canonicalUrl` echoes the canonical URL. | **Switch the form to manual-entry mode**, pre-filled with the echoed `canonicalUrl`, asking for title + difficulty + topics |
| `401`  | Bad token                                                                                                                    |                                                                                                                             |

**Next.js usage.** A Server Action returning a discriminated union so the client can branch between
"prefilled" and "manual entry required":

```ts
'use server'

import { ApiError, apiFetch } from '@/lib/api/http'
import type { ProblemPreview } from '@/lib/api/types'

export type PreviewResult =
  | { status: 'resolved'; preview: ProblemPreview }
  | { status: 'exists'; preview: ProblemPreview } // existingProblemId is non-null
  | { status: 'manual'; canonicalUrl?: string; message: string }
  | { status: 'invalid'; message: string }

export async function previewProblem(url: string): Promise<PreviewResult> {
  try {
    const { data } = await apiFetch<ProblemPreview>('/api/problems/preview', {
      method: 'POST',
      body: { url },
    })
    return data.existingProblemId
      ? { status: 'exists', preview: data }
      : { status: 'resolved', preview: data }
  } catch (error) {
    if (error instanceof ApiError && error.needsManualMetadata) {
      return {
        status: 'manual',
        canonicalUrl: error.canonicalUrl,
        message: error.message,
      }
    }
    if (error instanceof ApiError && error.status === 400) {
      return { status: 'invalid', message: error.message }
    }
    throw error
  }
}
```

---

#### `POST /api/problems`

**Purpose.** Capture a problem into the library. Two capture modes, distinguished by a **discriminated
union on `source`**.

**Auth.** Yes.

**Request body — variant A: `source: "LEETCODE"`**

| Field        | Type                           | Required    | Rules                                                                                                            |
| ------------ | ------------------------------ | ----------- | ---------------------------------------------------------------------------------------------------------------- |
| `source`     | `"LEETCODE"`                   | ✅          | literal                                                                                                          |
| `url`        | `string`                       | ✅          | LeetCode problem URL (same rules as preview)                                                                     |
| `title`      | `string`                       | ⛔️/✅       | 1–300 chars. **Supplying it switches the request into manual-entry mode** and skips the LeetCode lookup entirely |
| `difficulty` | `"EASY" \| "MEDIUM" \| "HARD"` | conditional | `UNRATED` is **rejected** for LeetCode problems. Required when `title` is supplied                               |
| `topics`     | `string[]`                     | ⛔️          | each 1–60 chars                                                                                                  |
| `statement`  | `string`                       | ⛔️          | ≤ 20 000 chars                                                                                                   |

**Request body — variant B: `source: "CUSTOM"`**

| Field        | Type         | Required | Rules                                  |
| ------------ | ------------ | -------- | -------------------------------------- |
| `source`     | `"CUSTOM"`   | ✅       | literal                                |
| `title`      | `string`     | ✅       | 1–300 chars                            |
| `difficulty` | `Difficulty` | ⛔️       | any of the four; defaults to `UNRATED` |
| `topics`     | `string[]`   | ⛔️       | each 1–60 chars                        |
| `sourceName` | `string`     | ⛔️       | ≤ 200 chars, e.g. `"CTCI ch. 4"`       |
| `sourceUrl`  | `string`     | ⛔️       | absolute `http(s)` URL                 |
| `statement`  | `string`     | ⛔️       | ≤ 20 000 chars                         |

```json
// Automatic LeetCode capture
{ "source": "LEETCODE", "url": "https://leetcode.com/problems/two-sum/" }

// Manual LeetCode capture (lookup failed)
{
  "source": "LEETCODE",
  "url": "https://leetcode.com/problems/two-sum/",
  "title": "Two Sum",
  "difficulty": "EASY",
  "topics": ["Array", "Hash Table"]
}

// Custom problem
{
  "source": "CUSTOM",
  "title": "Rotate a matrix in place",
  "difficulty": "MEDIUM",
  "topics": ["Matrix", "Two Pointers"],
  "sourceName": "Cracking the Coding Interview",
  "sourceUrl": "https://example.com/ctci"
}
```

**Behaviour.**

- **LeetCode:** canonicalizes the URL. If a problem with that `canonicalUrl` already exists it is
  returned as-is with `alreadyExisted: true` and **status `200`** — no duplicate row is created and
  nothing is overwritten. Otherwise it resolves metadata (unless `title` was supplied), creates the
  problem, upserts topics, and returns `alreadyExisted: false` with **status `201`**. A race between
  two concurrent captures of the same URL is caught (`P2002`) and resolved into the existing row
  rather than erroring.
- **Custom:** always creates, always `metadataEnteredManually: true`, always `201`.
- Topics are normalized (trim, collapse whitespace, lowercase, hyphenate → slug), deduplicated, and
  created on demand. `"Binary Search"` and `"binary search"` resolve to the same topic; the **first**
  created display name wins.
- The new problem has **no revision cycle**: `practiceState`, `currentStage`, `nextDueDate` are all
  `null` until the first attempt.

**Success `201` (created) or `200` (already existed)** — `data: Problem & { alreadyExisted: boolean }`.

```jsonc
{
  "success": true,
  "statusCode": 201,
  "message": "Problem created successfully",
  "data": {
    "id": "9a1c…",
    "source": "LEETCODE",
    "title": "Two Sum",
    "canonicalUrl": "https://leetcode.com/problems/two-sum/",
    "sourceName": null,
    "sourceUrl": null,
    "difficulty": "EASY",
    "statement": null,
    "solutionViewed": false,
    "metadataEnteredManually": false,
    "topics": [
      { "slug": "array", "name": "Array" },
      { "slug": "hash-table", "name": "Hash Table" },
    ],
    "currentStage": null,
    "nextDueDate": null,
    "nextDueAt": null,
    "practiceState": null,
    "attemptCount": 0,
    "createdAt": "2026-08-08T12:00:00.000Z",
    "updatedAt": "2026-08-08T12:00:00.000Z",
    "alreadyExisted": false,
  },
}
```

**Errors**

| Status | Cause                                                                                                                         |
| ------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `400`  | Zod: bad discriminant, missing `title` for `CUSTOM`, `UNRATED` sent for `LEETCODE`, over-length fields, malformed `sourceUrl` |
| `400`  | `AppError`: the URL isn't a LeetCode problem URL                                                                              |
| `422`  | Metadata unresolvable and no `title` supplied → retry with manual metadata. `errorDetails.canonicalUrl` is echoed             |
| `422`  | `title` supplied without `difficulty` (or vice versa) in manual mode                                                          |
| `401`  | Bad token                                                                                                                     |

**Next.js usage.** Branch the UI on `alreadyExisted` — redirect to the existing problem instead of
showing a fake "created" toast:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { ApiError, apiFetch } from '@/lib/api/http'
import type { ProblemCreated } from '@/lib/api/types'

export type CaptureState = {
  message?: string
  needsManual?: boolean
  canonicalUrl?: string
}

export async function captureProblem(
  _prev: CaptureState,
  formData: FormData,
): Promise<CaptureState> {
  const source = formData.get('source') as 'LEETCODE' | 'CUSTOM'
  const topics = formData
    .getAll('topics')
    .map(String)
    .map((t) => t.trim())
    .filter(Boolean)

  const body =
    source === 'LEETCODE'
      ? {
          source,
          url: String(formData.get('url')),
          ...(formData.get('title')
            ? { title: String(formData.get('title')) }
            : {}),
          ...(formData.get('difficulty')
            ? { difficulty: String(formData.get('difficulty')) }
            : {}),
          ...(topics.length ? { topics } : {}),
        }
      : {
          source,
          title: String(formData.get('title')),
          difficulty: String(formData.get('difficulty') || 'UNRATED'),
          ...(topics.length ? { topics } : {}),
          ...(formData.get('sourceName')
            ? { sourceName: String(formData.get('sourceName')) }
            : {}),
          ...(formData.get('sourceUrl')
            ? { sourceUrl: String(formData.get('sourceUrl')) }
            : {}),
        }

  let created: ProblemCreated
  try {
    created = (
      await apiFetch<ProblemCreated>('/api/problems', { method: 'POST', body })
    ).data
  } catch (error) {
    if (error instanceof ApiError && error.needsManualMetadata) {
      return {
        needsManual: true,
        canonicalUrl: error.canonicalUrl,
        message: error.message,
      }
    }
    if (error instanceof ApiError) return { message: error.message }
    throw error
  }

  revalidatePath('/problems')
  revalidatePath('/topics')
  redirect(
    `/problems/${created.id}${created.alreadyExisted ? '?existing=1' : ''}`,
  )
}
```

---

#### `GET /api/problems`

**Purpose.** The library listing — paginated, filterable, sortable.

**Auth.** Yes.

**Query parameters** (all optional; parsed with Zod, so a bad value is a `400`)

| Param            | Type                                                                     | Default                                         | Notes                                                                                          |
| ---------------- | ------------------------------------------------------------------------ | ----------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `page`           | integer ≥ 1                                                              | `1`                                             |                                                                                                |
| `limit`          | integer 1–`MAX_PAGE_SIZE` (default 100)                                  | `20`                                            | Values above the cap are a `400`; the service also clamps                                      |
| `difficulty`     | **comma-separated** `EASY,MEDIUM,HARD,UNRATED`                           | —                                               | e.g. `difficulty=MEDIUM,HARD`                                                                  |
| `status`         | **comma-separated** `SCHEDULED,DUE,OVERDUE,MASTERED,NEEDS_REINFORCEMENT` | —                                               | See the note below                                                                             |
| `source`         | `LEETCODE` \| `CUSTOM`                                                   | —                                               | single value, not CSV                                                                          |
| `topic`          | comma-separated topic **slugs**                                          | —                                               | `topic=array,hash-table` → problems tagged with _any_ of them                                  |
| `pattern`        | comma-separated pattern **slugs**                                        | —                                               | `pattern=two-pointers,sliding-window` → problems whose **card** is tagged with any of them     |
| `solutionViewed` | `"true"` \| `"false"`                                                    | —                                               | string literals, not booleans                                                                  |
| `hasRecallCard`  | `"true"` \| `"false"`                                                    | —                                               | string literals. `false` is the "attempted but never written up" backlog                       |
| `search`         | `string`                                                                 | —                                               | case-insensitive `contains` on **title only** — use [`/api/search`](#813-search) to match note and card text |
| `sortBy`         | `createdAt` \| `title` \| `difficulty` \| `nextDueAt`                    | `createdAt`                                     | `difficulty` sorts by enum declaration order (EASY, MEDIUM, HARD, UNRATED), not alphabetically |
| `sortOrder`      | `asc` \| `desc`                                                          | `desc` when `sortBy=createdAt`, otherwise `asc` | `nextDueAt` always sorts nulls last                                                            |

> **`status` semantics.** `DUE`/`OVERDUE`/`SCHEDULED` are translated into `nextDueAt` **range
> predicates** against the owner's local day, not matched against a stored column — so they are
> always correct at read time. `MASTERED`/`NEEDS_REINFORCEMENT` match the stored column. Any `status`
> filter also implicitly excludes problems that have **never been attempted** (they have no cycle);
> those remain reachable through the unfiltered listing. Multiple statuses are OR-ed.

Example: `GET /api/problems?status=DUE,OVERDUE&difficulty=MEDIUM,HARD&topic=dynamic-programming&sortBy=nextDueAt&sortOrder=asc&page=1&limit=20`

**Behaviour.** Builds an AND of the filters, orders by the requested column with `id asc` as a stable
tiebreaker, and returns the page plus a total count. Each row is passed through the presenter, so
`practiceState` is freshly derived and `attemptCount` is included. Recall state (`patterns`,
`hasRecallCard`, `needsRecallUpdate`) is resolved once for the whole page, not per row.

**Success `200`** — `data: Problem[]`, plus `meta`:

```jsonc
{
  "success": true,
  "statusCode": 200,
  "message": "Problems retrieved successfully",
  "meta": { "page": 1, "limit": 20, "total": 137, "totalPages": 7 },
  "data": [
    /* Problem[] — same shape as the create response minus alreadyExisted */
  ],
}
```

**Errors.** `400` on any invalid query value (bad enum in a CSV, `limit` over the cap, non-integer
`page`). `401` on a bad token.

**Next.js usage.** Drive filters from the URL so the page stays shareable, bookmarkable, and
server-rendered:

```tsx
// app/(app)/problems/page.tsx
import { Suspense } from 'react'
import { apiFetch } from '@/lib/api/http'
import type { ApiMeta, Problem } from '@/lib/api/types'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function ProblemsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const one = (key: string) =>
    Array.isArray(params[key]) ? params[key][0] : params[key]

  const { data, meta } = await apiFetch<Problem[]>('/api/problems', {
    query: {
      page: one('page') ?? 1,
      limit: 20,
      status: one('status'),
      difficulty: one('difficulty'),
      topic: one('topic'),
      pattern: one('pattern'),
      source: one('source'),
      hasRecallCard: one('hasRecallCard'),
      search: one('q'),
      sortBy: one('sortBy'),
      sortOrder: one('sortOrder'),
    },
  })

  return (
    <>
      <FilterBar />
      <ProblemTable problems={data} />
      <Pagination meta={meta as ApiMeta} />
    </>
  )
}
```

Any Client Component that reads `useSearchParams()` must sit inside a `<Suspense>` boundary, or the
whole route bails out to client-side rendering at build time.

---

#### `GET /api/problems/:id`

**Purpose.** The problem detail view: metadata, the recall card, full attempt history, full revision
event log, and the projected stage timeline — everything in one request.

**Auth.** Yes.

**Path params.** `id` — problem UUID.

**Behaviour.** Loads the problem (scoped to the owner), then in parallel loads all attempts (newest
first), all revision events (newest first), the live schedule, and the recall card. Projects the
6-stage timeline from the schedule. Returns `cycleStartsOnFirstAttempt: true` when no schedule exists
yet, so the UI can render an empty-state instead of an empty timeline.

> **Recall fields are split across two places, deliberately.** `recallCard` holds the *text*
> (`keyInsight`, `approach`, `pitfalls`, complexities, timestamps). The problem's `patterns`,
> `hasRecallCard`, and `needsRecallUpdate` sit at the **top level**, not inside `recallCard`, because
> they are also present on every listing row. `recallCard` is `null` — never omitted — when there is
> no card. You do not need a separate `GET .../recall` call to render this page.

> Attempts and revisions are **not paginated** here — the whole history comes back. Use
> `GET /api/problems/:id/attempts` if you need a paginated attempt view.

**Success `200`** — `data: ProblemDetail`:

```jsonc
{
  "id": "9a1c…",
  "source": "LEETCODE",
  "title": "Two Sum",
  "canonicalUrl": "https://leetcode.com/problems/two-sum/",
  "sourceName": null,
  "sourceUrl": null,
  "difficulty": "EASY",
  "statement": null,
  "solutionViewed": false,
  "metadataEnteredManually": false,
  "topics": [{ "slug": "array", "name": "Array" }],
  "patterns": [{ "slug": "hash-map-complement", "name": "Hash Map Complement" }],
  "hasRecallCard": true,
  "needsRecallUpdate": false,
  "currentStage": "DAY_7",
  "nextDueDate": "2026-08-11",
  "nextDueAt": "2026-08-10T18:00:00.000Z",
  "practiceState": "SCHEDULED",
  "attemptCount": 3,
  "createdAt": "2026-08-01T…",
  "updatedAt": "2026-08-07T…",

  "recallCard": {
    "keyInsight": "Store seen values in a map; look up target − x before inserting x",
    "approach": "One pass. For each x, check the map for target − x, else insert x → index.",
    "pitfalls": "Inserting before looking up returns the same index twice.",
    "timeComplexity": "O(n)",
    "spaceComplexity": "O(n)",
    "createdAt": "2026-08-05T…",
    "updatedAt": "2026-08-07T…",
  },

  "anchorDate": "2026-08-04",
  "attempts": [/* Attempt[], newest first */],
  "revisions": [/* RevisionEvent[], newest first */],
  "timeline": [
    { "stage": "DAY_0", "date": "2026-08-04", "status": "completed" },
    { "stage": "DAY_1", "date": "2026-08-05", "status": "completed" },
    { "stage": "DAY_3", "date": "2026-08-07", "status": "completed" },
    { "stage": "DAY_7", "date": "2026-08-11", "status": "current" },
    { "stage": "DAY_15", "date": "2026-08-19", "status": "upcoming" },
    { "stage": "DAY_30", "date": "2026-09-03", "status": "upcoming" },
  ],
  "cycleStartsOnFirstAttempt": false,
}
```

**Errors.** `404` unknown id or not the owner's; `400` malformed UUID (Prisma `P2023`); `401`.

---

#### `PATCH /api/problems/:id`

**Purpose.** Edit a problem's metadata. **Never touches attempts or the revision schedule.**

**Auth.** Yes.

**Path params.** `id` — problem UUID.

**Request body.** All fields optional, but **at least one must be present** or you get a `400`
("Provide at least one field to update").

| Field          | Type             | Rules                                                                                                                                   |
| -------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `title`        | `string`         | 1–300 chars                                                                                                                             |
| `difficulty`   | `Difficulty`     | `UNRATED` rejected for `LEETCODE` problems (`400`)                                                                                      |
| `topics`       | `string[]`       | **Replaces the entire topic set.** Send the full desired list; omitted topics are unlinked                                              |
| `sourceName`   | `string \| null` | ≤ 200 chars; `null` clears it                                                                                                           |
| `sourceUrl`    | `string \| null` | absolute `http(s)` URL; `null` clears it                                                                                                |
| `statement`    | `string \| null` | ≤ 20 000 chars; `null` clears it                                                                                                        |
| `canonicalUrl` | `string`         | Accepted but **immutable** — sending a value different from the stored one is a `400`. Only send it if you're echoing the current value |

```json
{ "difficulty": "HARD", "topics": ["Dynamic Programming", "Memoization"] }
```

**Behaviour.** Validates the immutability rules, updates the scalar fields, and (if `topics` was
supplied) replaces the join rows inside a transaction, creating any new topics on demand. `source`
cannot be changed at all — it isn't in the schema.

> **`patterns` is not accepted here.** The field is not part of this schema, so it is stripped before
> validation and the problem's patterns are left unchanged. Two consequences worth knowing:
> a body of **only** `{ "patterns": [...] }` strips to an empty object and fails the
> at-least-one-field rule with a `400`; a body of `{ "title": "…", "patterns": [...] }` succeeds with
> a `200` and silently ignores the patterns. Patterns are authored through
> [`PUT /api/problems/:id/recall`](#811-recall-cards). Editing `topics` never disturbs patterns, and
> vice versa.

**Success `200`** — `data: Problem` (the presented shape, with freshly derived `practiceState`).

**Errors**

| Status | Cause                                                                   |
| ------ | ----------------------------------------------------------------------- |
| `400`  | Empty body; over-length values; malformed `sourceUrl`; empty topic name |
| `400`  | `"The canonical URL of a captured problem cannot be changed"`           |
| `400`  | `"UNRATED difficulty is only available for custom problems"`            |
| `404`  | Unknown problem id                                                      |
| `401`  | Bad token                                                               |

---

#### `DELETE /api/problems/:id`

**Purpose.** Permanently remove a problem and everything attached to it.

**Auth.** Yes.

**Behaviour.** Verifies ownership, then deletes. **Attempts, topic links, pattern links, the recall
card, the revision schedule, and all revision events cascade.** There is no soft delete and no undo —
always confirm in the UI. Deleting a problem can therefore leave a pattern with a `problemCount` of 0.

**Success `200`** — `data: { "id": "9a1c…" }`.

**Errors.** `404` unknown id; `401`.

**Next.js usage**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { apiFetch } from '@/lib/api/http'

export async function deleteProblem(id: string) {
  await apiFetch<{ id: string }>(`/api/problems/${id}`, { method: 'DELETE' })

  revalidatePath('/problems')
  revalidatePath('/dashboard')
  revalidatePath('/insights')
  redirect('/problems')
}
```

---

### 8.4 Attempts

Attempts are problem-scoped for create/list, and attempt-scoped for edit/delete (because both trigger
a replay of the parent problem's schedule).

---

#### `POST /api/problems/:id/attempts`

**Purpose.** Log a solve. This is the single most important write in the product — it starts or
advances the revision cycle.

**Auth.** Yes.

**Path params.** `id` — the **problem** UUID.

**Request body**

| Field             | Type                                                                | Required | Rules                                                                                                             |
| ----------------- | ------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------- |
| `outcome`         | `"SOLVED_INDEPENDENTLY" \| "SOLVED_WITH_HINT" \| "VIEWED_SOLUTION"` | ✅       |                                                                                                                   |
| `durationMinutes` | integer                                                             | ✅       | 1–1440                                                                                                            |
| `confidence`      | integer                                                             | ✅       | 1–5                                                                                                               |
| `notes`           | `string \| null`                                                    | ⛔️       | ≤ `MAX_NOTES_LENGTH` (default 2000)                                                                               |
| `attemptedAt`     | ISO date-time / date string                                         | ⛔️       | Coerced to a `Date`. **Must not be in the future.** Defaults to now. Backfilling a forgotten attempt is supported |

```json
{
  "outcome": "SOLVED_INDEPENDENTLY",
  "durationMinutes": 22,
  "confidence": 4,
  "notes": "Hash map on the complement; got it first try this time.",
  "attemptedAt": "2026-08-08T14:30:00.000Z"
}
```

**Behaviour.**

1. 404s immediately if the problem id is unknown — nothing is written.
2. Resolves the owner's timezone and today's local date.
3. In **one transaction**: inserts the attempt, then replays the entire schedule from the full
   attempt history + stored reschedules, rewrites the derived revision events, upserts the
   `RevisionSchedule`, and updates the denormalized fields on `Problem`.
4. Returns both the created attempt and the resulting schedule so the UI needs no follow-up read.

Effect on the schedule (for UI copy — the engine owns the arithmetic):

| Outcome                | Effect                                                                                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SOLVED_INDEPENDENTLY` | Advances to the next stage (`anchor + offset`, falling back to `attemptDate + step` if that would be in the past). Confidence ≥ 4 at `DAY_30` completes the cycle as `MASTERED` |
| `SOLVED_WITH_HINT`     | **Repeats** the current stage at `attemptDate + step`                                                                                                                           |
| `VIEWED_SOLUTION`      | **Resets** the cycle — re-anchors at the attempt date, at any stage, including after mastery. Also sets `solutionViewed: true` on the problem                                   |

**Success `201`** — `data: AttemptCreated`:

```json
{
  "attempt": {
    "id": "3f21…",
    "userId": "b4f0…",
    "problemId": "9a1c…",
    "outcome": "SOLVED_INDEPENDENTLY",
    "durationMinutes": 22,
    "confidence": 4,
    "notes": "Hash map on the complement…",
    "attemptedAt": "2026-08-08T14:30:00.000Z",
    "createdAt": "2026-08-08T14:31:02.010Z",
    "updatedAt": "2026-08-08T14:31:02.010Z"
  },
  "currentStage": "DAY_7",
  "nextDueDate": "2026-08-11",
  "practiceState": "SCHEDULED",
  "solutionViewed": false
}
```

This is the `DAY_3 → DAY_7` advance for the running example: anchored 2026-08-04, `DAY_3` was due
2026-08-07 and solved a day late on 2026-08-08, so `DAY_7` still takes its anchor-relative date of
2026-08-11 rather than the late-advance fallback.

**Errors**

| Status | Cause                                                                                                                       |
| ------ | --------------------------------------------------------------------------------------------------------------------------- |
| `400`  | Zod: bad outcome, duration out of 1–1440, confidence out of 1–5, notes too long, `attemptedAt` in the future or unparseable |
| `404`  | Unknown problem id                                                                                                          |
| `401`  | Bad token                                                                                                                   |

**Next.js usage**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { ApiError, apiFetch } from '@/lib/api/http'
import type { AttemptCreated } from '@/lib/api/types'

export type LogAttemptState = {
  ok?: boolean
  message?: string
  fieldErrors?: Record<string, string>
  schedule?: {
    currentStage: string | null
    nextDueDate: string | null
    practiceState: string | null
  }
}

export async function logAttempt(
  problemId: string,
  _prev: LogAttemptState,
  formData: FormData,
): Promise<LogAttemptState> {
  const body = {
    outcome: String(formData.get('outcome')),
    durationMinutes: Number(formData.get('durationMinutes')),
    confidence: Number(formData.get('confidence')),
    notes: formData.get('notes')?.toString().trim() || null,
    // Only send attemptedAt when backfilling; omit to default to "now".
    ...(formData.get('attemptedAt')
      ? {
          attemptedAt: new Date(
            String(formData.get('attemptedAt')),
          ).toISOString(),
        }
      : {}),
  }

  let result: AttemptCreated
  try {
    result = (
      await apiFetch<AttemptCreated>(`/api/problems/${problemId}/attempts`, {
        method: 'POST',
        body,
      })
    ).data
  } catch (error) {
    if (error instanceof ApiError) {
      return { message: error.message, fieldErrors: error.fieldErrors }
    }
    throw error
  }

  revalidatePath(`/problems/${problemId}`)
  revalidatePath('/problems')
  revalidatePath('/dashboard')
  revalidatePath('/insights')

  return {
    ok: true,
    message: result.nextDueDate
      ? `Logged. Next revision ${result.nextDueDate} (${result.currentStage}).`
      : 'Logged. This problem is now mastered. 🎉',
    schedule: {
      currentStage: result.currentStage,
      nextDueDate: result.nextDueDate,
      practiceState: result.practiceState,
    },
  }
}
```

Bind the `problemId` with `.bind()` so the action still works as a `<form action>`:

```tsx
'use client'
import { useActionState } from 'react'
import { logAttempt } from './actions'

export function LogAttemptForm({ problemId }: { problemId: string }) {
  const action = logAttempt.bind(null, problemId)
  const [state, formAction, pending] = useActionState(action, {})
  // …render fields, state.fieldErrors.durationMinutes, etc.
}
```

Note that `durationMinutes` and `confidence` must be sent as **JSON numbers**, not strings — the Zod
schemas use `z.number()` with no coercion, so `"22"` is a `400`.

---

#### `GET /api/problems/:id/attempts`

**Purpose.** Paginated attempt history for one problem. (The detail endpoint already returns the full
history, so use this only for a dedicated, paginated history view.)

**Auth.** Yes.

**Path params.** `id` — the **problem** UUID.

**Query parameters**

| Param   | Type                      | Default |
| ------- | ------------------------- | ------- |
| `page`  | integer ≥ 1               | `1`     |
| `limit` | integer 1–`MAX_PAGE_SIZE` | `20`    |

**Behaviour.** 404s if the problem is unknown. Returns attempts ordered by `attemptedAt` descending.

**Success `200`** — `data: Attempt[]` plus `meta: { page, limit, total, totalPages }`.

**Errors.** `400` bad pagination; `404` unknown problem; `401`.

---

#### `PATCH /api/attempts/:id`

**Purpose.** Correct a logged attempt. Note the path is **`/api/attempts/:id`**, not problem-scoped —
the `id` is the **attempt** id.

**Auth.** Yes.

**Request body.** All optional, **at least one required**.

| Field             | Type             | Rules             |
| ----------------- | ---------------- | ----------------- |
| `outcome`         | `AttemptOutcome` |                   |
| `durationMinutes` | integer          | 1–1440            |
| `confidence`      | integer          | 1–5               |
| `notes`           | `string \| null` | ≤ 2000            |
| `attemptedAt`     | date-time        | not in the future |

**Behaviour.** Updates the row and then **replays the whole schedule** from the problem's full
history. Changing `outcome`, `confidence`, or `attemptedAt` can therefore change the current stage,
due date, and practice state — even for attempts far in the past. The response carries the new
schedule.

**Success `200`** — `data: AttemptUpdated`:

```json
{
  "attempt": {/* the updated Attempt */},
  "currentStage": "DAY_1",
  "nextDueDate": "2026-08-09",
  "practiceState": "SCHEDULED"
}
```

Note: unlike the create response, this one does **not** include `solutionViewed`. Refetch the problem
if you need it.

**Errors.** `400` empty body or invalid field; `404` unknown attempt id; `401`.

**UI note.** Because an edit can silently move the schedule, show the returned `nextDueDate` /
`currentStage` in the success toast rather than assuming nothing changed.

---

#### `DELETE /api/attempts/:id`

**Purpose.** Remove a mis-logged attempt.

**Auth.** Yes.

**Behaviour.** Deletes the attempt and replays. **If it was the last attempt, the problem loses its
revision cycle entirely** — the schedule row and all derived revision events are deleted, and
`practiceState`, `currentStage`, `nextDueAt`, `solutionViewed` are reset to `null`/`false`.

**Success `200`** — `data: AttemptDeleted`:

```json
{
  "id": "3f21…",
  "problemId": "9a1c…",
  "currentStage": null,
  "nextDueDate": null,
  "practiceState": null
}
```

`currentStage: null` in the response is your signal that the cycle no longer exists — render the
"log your first attempt to start the cycle" empty state.

**Errors.** `404` unknown attempt id; `401`.

---

### 8.5 Revisions

---

#### `GET /api/problems/:id/revisions`

**Purpose.** The audited revision event log for one problem — the "what happened and when" feed.

**Auth.** Yes.

**Path params.** `id` — the **problem** UUID.

**Input.** No query parameters; the full log is returned, newest first.

**Behaviour.** 404s on an unknown problem. Returns all `RevisionEvent` rows ordered by `createdAt`
descending.

**Success `200`** — `data: RevisionEvent[]`:

```json
[
  {
    "id": "c81a…",
    "userId": "b4f0…",
    "problemId": "9a1c…",
    "type": "ADVANCED",
    "stage": "DAY_3",
    "fromDueAt": "2026-08-04T18:00:00.000Z",
    "toDueAt": "2026-08-06T18:00:00.000Z",
    "reason": null,
    "createdAt": "2026-08-05T14:31:02.010Z"
  }
]
```

Read against the running example (anchor 2026-08-04, owner in `Asia/Dhaka`): `DAY_1` was due local
2026-08-05 and completed that day, advancing to `DAY_3` due local 2026-08-07. Instants are UTC, so a
local date shows as the previous day at 18:00Z.

**Rendering the event types**

| `type`                  | Meaning                                                                                          | Suggested copy                         |
| ----------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------- |
| `CYCLE_STARTED`         | First attempt created the cycle                                                                  | "Revision cycle started"               |
| `COMPLETED`             | A stage was completed against its due date. `fromDueAt` is the due date it was completed against | "Completed Day 7 revision"             |
| `ADVANCED`              | Moved to the next stage after an independent solve                                               | "Advanced to Day 15"                   |
| `REPEATED`              | Stage repeated after a hint                                                                      | "Repeating Day 7 — solved with a hint" |
| `RESET`                 | Cycle re-anchored after viewing the solution                                                     | "Cycle reset — solution viewed"        |
| `RESCHEDULED`           | Manual move. `reason` is always populated                                                        | "Rescheduled: <reason>"                |
| `MASTERED`              | Day 30 completed with confidence ≥ 4                                                             | "Mastered 🎉"                          |
| `REINFORCEMENT_STARTED` | Day 30 completed with low confidence                                                             | "Reinforcement cycle started"          |

> ⚠️ Every event except `RESCHEDULED` is **derived** and is deleted and rewritten on every replay.
> Their `id`s change. Do not persist them client-side or use them as stable React keys across
> refetches; `` `${type}-${createdAt}` `` or the array index is safer.
>
> `fromDueAt`/`toDueAt` are **instants** (UTC), not `LocalDate`s. Convert with the owner's timezone
> before display.

---

#### `PATCH /api/problems/:id/revisions/reschedule`

**Purpose.** Manually move the next revision to a different day — "I'm travelling, push this to
Friday" — with a recorded, auditable reason.

**Auth.** Yes.

**Path params.** `id` — the **problem** UUID.

**Request body**

| Field     | Type                       | Required | Rules                                                                               |
| --------- | -------------------------- | -------- | ----------------------------------------------------------------------------------- |
| `dueDate` | `LocalDate` (`yyyy-MM-dd`) | ✅       | Must be a valid calendar date; **must not be before today** in the owner's timezone |
| `reason`  | `string`                   | ✅       | 1–500 chars after trimming. **Not optional** — a reschedule is an audited decision  |

```json
{ "dueDate": "2026-08-15", "reason": "Travelling until Friday" }
```

**Behaviour.** Validates the date is not in the past, that the problem exists, that it **has a
revision cycle**, and that the cycle is **not mastered**. Then records a `RESCHEDULED` event as
**stored input** and replays. Because it is input rather than derived output, the reschedule survives
future replays and is fed back into the engine in timestamp order. The stage and the anchor used for
subsequent stages are deliberately left untouched — only this occurrence moves.

**Success `200`** — `data: RescheduleResult`:

```json
{
  "currentStage": "DAY_7",
  "dueDate": "2026-08-15",
  "anchorDate": "2026-08-04",
  "practiceState": "SCHEDULED",
  "timeline": [
    { "stage": "DAY_0", "date": "2026-08-04", "status": "completed" },
    { "stage": "DAY_1", "date": "2026-08-05", "status": "completed" },
    { "stage": "DAY_3", "date": "2026-08-07", "status": "completed" },
    { "stage": "DAY_7", "date": "2026-08-15", "status": "current" },
    { "stage": "DAY_15", "date": "2026-08-19", "status": "upcoming" },
    { "stage": "DAY_30", "date": "2026-09-03", "status": "upcoming" }
  ]
}
```

Note the `current` entry carries the rescheduled date (2026-08-15) while `DAY_15` and `DAY_30` keep
their anchor-relative projections — a reschedule moves only the occurrence in front of you.

**Errors**

| Status | Message                                                                  | UI response                                                                    |
| ------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `400`  | `"Due date must be a calendar date in yyyy-MM-dd form"`                  | Fix the date input format                                                      |
| `400`  | `"A reason is required when rescheduling a revision"`                    | Require the field client-side too                                              |
| `400`  | `"A revision cannot be rescheduled to a date before today"`              | Set the date picker's `min` to the owner's today (from the dashboard's `date`) |
| `400`  | `"This problem has no revision cycle yet — log an attempt to start one"` | Hide the reschedule control until `currentStage !== null`                      |
| `400`  | `"A mastered problem has no scheduled revision to move"`                 | Hide the control when `practiceState === "MASTERED"`                           |
| `404`  | Unknown problem id                                                       |                                                                                |

**Next.js usage.** Send the date as a plain `yyyy-MM-dd` string straight from `<input type="date">` —
do **not** convert it to an ISO instant:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { ApiError, apiFetch } from '@/lib/api/http'
import type { RescheduleResult } from '@/lib/api/types'

export async function reschedule(
  problemId: string,
  _prev: { message?: string },
  formData: FormData,
) {
  try {
    await apiFetch<RescheduleResult>(
      `/api/problems/${problemId}/revisions/reschedule`,
      {
        method: 'PATCH',
        body: {
          dueDate: String(formData.get('dueDate')), // already yyyy-MM-dd from <input type="date">
          reason: String(formData.get('reason')),
        },
      },
    )
  } catch (error) {
    if (error instanceof ApiError) return { message: error.message }
    throw error
  }

  revalidatePath(`/problems/${problemId}`)
  revalidatePath('/dashboard')
  return { message: 'Revision rescheduled.' }
}
```

---

### 8.6 Topics

Topics are a normalized, **global** vocabulary — they are created implicitly when a problem is tagged.
There is no create or delete endpoint.

---

#### `GET /api/topics`

**Purpose.** The topic vocabulary, for filter chips, tag autocomplete, and the topic management page.

**Auth.** Yes.

**Query parameters**

| Param      | Type     | Notes                                                                                                                                                      |
| ---------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `usedOnly` | `"true"` | The **literal string `"true"`**; any other value (including `"1"`) is treated as false. When true, only topics linked to at least one problem are returned |

**Behaviour.** Returns every topic with a problem count, ordered by **problem count descending, then
name ascending** — so the most-used topics come first, which is what you want for filter chips.

**Success `200`** — `data: TopicWithCount[]`:

```json
[
  { "id": "0a11…", "slug": "array", "name": "Array", "problemCount": 42 },
  {
    "id": "0a12…",
    "slug": "dynamic-programming",
    "name": "Dynamic Programming",
    "problemCount": 17
  }
]
```

**Note.** The `slug` is what `GET /api/problems?topic=` expects — filter by slug, display `name`.

**Errors.** `401`.

---

#### `PATCH /api/topics/:id`

**Purpose.** Rename a topic — and, implicitly, **merge** two topics.

**Auth.** Yes.

**Path params.** `id` — topic UUID.

**Request body**

| Field  | Type     | Rules                                                       |
| ------ | -------- | ----------------------------------------------------------- |
| `name` | `string` | 1–`MAX_TOPIC_NAME_LENGTH` (default 60) chars after trimming |

```json
{ "name": "Dynamic Programming" }
```

**Behaviour.** Normalizes the name into a slug (trim → collapse whitespace → lowercase → hyphenate).

- **No collision:** the topic's `slug` and `name` are both updated in place. Returns the updated topic.
- **Collision with a different topic:** the two are **merged**. All problem links move to the existing
  (surviving) topic, duplicates are collapsed, the renamed topic row is **deleted**, and the
  **surviving topic** is returned. So the `id` you get back may not be the `id` you sent.

**Success `200`** — `data: Topic` (full row, including `createdAt`/`updatedAt`).

**Errors**

| Status | Cause                                                                                         |
| ------ | --------------------------------------------------------------------------------------------- |
| `400`  | Empty/whitespace-only name, name too long, or a name that slugifies to nothing (e.g. `"!!!"`) |
| `404`  | Unknown topic id                                                                              |
| `401`  | Bad token                                                                                     |

**UI note.** Because a rename can destroy a topic, warn the user when the normalized name collides
with an existing topic ("This will merge <A> into <B>"), and compare `data.id` to the id you sent to
detect that a merge happened. Always revalidate `/topics` **and** `/problems` afterwards.

---

### 8.7 Dashboard

---

#### `GET /api/dashboard/today`

**Purpose.** Everything the Today screen needs, in one request: what's due, what's overdue, the
7-day lookahead, and the current streak.

**Auth.** Yes.

**Input.** None — the response is derived entirely from the owner's settings and the current instant.

**Behaviour.**

- Resolves the owner's timezone and local `today`.
- `dueCount` = problems whose `nextDueAt` falls **inside today**.
- `overdueCount` = problems whose `nextDueAt` is **before today**.
- `due` = **all** of them (overdue + due today), ordered earliest due date first — so the most overdue
  appears at the top and due-today at the bottom. Not paginated.
- `recommended` = the first 5 entries of `due`. This is a **workload suggestion, not a filter** —
  `due` still contains everything, so nothing is hidden.
- `upcoming` = exactly **7 entries starting tomorrow**, each `{ date, count }`. Days with nothing due
  are present with `count: 0`. Overdue work never appears here.
- `streak` = consecutive local days with at least one attempt, counting back from today. A missing
  today does **not** break a streak that is current through yesterday (so the streak doesn't read as
  broken at 9 a.m.).
- Mastered problems and never-attempted problems have a `null` `nextDueAt` and are excluded from
  every count.

**Success `200`** — `data: TodayDashboard`:

```json
{
  "date": "2026-08-08",
  "timezone": "Asia/Dhaka",
  "dueCount": 3,
  "overdueCount": 2,
  "due": [
    {
      "id": "9a1c…",
      "title": "Two Sum",
      "source": "LEETCODE",
      "difficulty": "EASY",
      "topics": [{ "slug": "array", "name": "Array" }],
      "stage": "DAY_7",
      "dueDate": "2026-08-06",
      "daysOverdue": 2,
      "solutionViewed": false,
      "practiceState": "OVERDUE"
    }
  ],
  "recommended": [/* first 5 of `due` */],
  "streak": 12,
  "upcoming": [
    { "date": "2026-08-09", "count": 1 },
    { "date": "2026-08-10", "count": 0 },
    { "date": "2026-08-11", "count": 4 },
    { "date": "2026-08-12", "count": 0 },
    { "date": "2026-08-13", "count": 2 },
    { "date": "2026-08-14", "count": 0 },
    { "date": "2026-08-15", "count": 1 }
  ]
}
```

**Errors.** `401`.

**Next.js usage.** This is the ideal streaming page — render the shell instantly and let the data
section resolve inside Suspense:

```tsx
// app/(app)/dashboard/page.tsx
import { Suspense } from 'react'
import { apiFetch } from '@/lib/api/http'
import type { TodayDashboard } from '@/lib/api/types'

export default function DashboardPage() {
  return (
    <main>
      <h1>Today</h1>
      <Suspense fallback={<TodaySkeleton />}>
        <TodaySection />
      </Suspense>
    </main>
  )
}

async function TodaySection() {
  const { data } = await apiFetch<TodayDashboard>('/api/dashboard/today')

  return (
    <>
      <StreakBadge value={data.streak} />
      <Counters due={data.dueCount} overdue={data.overdueCount} />
      <RecommendedList items={data.recommended} total={data.due.length} />
      <UpcomingChart days={data.upcoming} />
    </>
  )
}
```

If you also need, say, the reminder banner on this page, fetch both in **parallel** so they don't
waterfall:

```ts
const [dashboard, reminder] = await Promise.all([
  apiFetch<TodayDashboard>('/api/dashboard/today'),
  apiFetch<ReminderState>('/api/reminders/current'),
])
```

---

### 8.8 Insights

All five insights endpoints are read-only aggregates. Three of them accept the same optional date
range; `topics` and `patterns` take no input and are always all-time.

**Shared range query** (used by `summary`, `activity`, `backlog`)

| Param  | Type                       | Rules    |
| ------ | -------------------------- | -------- |
| `from` | `LocalDate` (`yyyy-MM-dd`) | Optional |
| `to`   | `LocalDate`                | Optional |

- `from` must be `<= to`, or `400`.
- The span must not exceed `MAX_INSIGHTS_RANGE_DAYS` (default **365** days), or `400`.
- **Omitting both means different things per endpoint** — see each below.

---

#### `GET /api/insights/summary`

**Purpose.** The headline KPI row: what was added, attempted, solved, mastered, plus revision
completion rate and average solve times.

**Auth.** Yes.

**Query.** `from`, `to` (see above). **Omitting both means "all time"** for the windowed metrics.

**Behaviour & metric definitions** — read carefully, these are not all windowed the same way:

| Field                                | Windowed by the range? | Definition                                                                                                                                                                                                                                    |
| ------------------------------------ | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `problemsAdded`                      | ✅ by `createdAt`      | Problems captured in the range                                                                                                                                                                                                                |
| `problemsAttempted`                  | ✅ by `attemptedAt`    | **Distinct problems** with at least one attempt in the range                                                                                                                                                                                  |
| `solvedIndependently`                | ✅                     | Distinct problems with at least one `SOLVED_INDEPENDENTLY` attempt in the range                                                                                                                                                               |
| `mastered`                           | ❌ **current total**   | Problems whose stored `practiceState` is `MASTERED` right now                                                                                                                                                                                 |
| `revisionCompletion.completedOnTime` | ✅                     | `COMPLETED` events where the completion local date ≤ the due local date                                                                                                                                                                       |
| `revisionCompletion.dueTotal`        | partly                 | `completedOnTime + completedPastDue + overdueNow` — the overdue term is the **current** overdue count, not a windowed one                                                                                                                     |
| `revisionCompletion.rate`            | —                      | `completedOnTime / dueTotal × 100`, rounded to 2 dp. **`null`**, not `0`, when `dueTotal` is 0                                                                                                                                                |
| `averageSolveTime.firstAttempt`      | ✅                     | Average `durationMinutes` of each problem's **chronologically first** attempt. The attempt-position window runs over each problem's _full_ history and the range is applied afterwards, so a mid-history attempt is never mislabelled "first" |
| `averageSolveTime.revision`          | ✅                     | Average of every non-first attempt                                                                                                                                                                                                            |
| `recallCoverage.attemptedProblems`   | ❌ **lifetime**        | Problems with at least one attempt, ever — the coverage denominator                                                                                                                                                                           |
| `recallCoverage.withCard`            | ❌ **lifetime**        | How many of those have a recall card                                                                                                                                                                                                          |
| `recallCoverage.needsUpdate`         | ❌ **lifetime**        | How many of those cards are stale (a `VIEWED_SOLUTION` attempt is newer than the card)                                                                                                                                                        |
| `recallCoverage.rate`                | —                      | `withCard / attemptedProblems × 100`, 2 dp. **`null`**, not `0`, when nothing has been attempted                                                                                                                                              |

`averageMinutes` is `null` (with `count: 0`) when the bucket is empty.

**Coverage is deliberately not windowed.** "Have I written this problem up?" is a question about the
library's current state; applying the date range would make the figure appear to drop whenever an old
problem falls outside the window. Don't label it with the selected range in the UI.

**Success `200`** — `data: InsightsSummary`:

```json
{
  "range": { "from": "2026-07-01", "to": "2026-08-08" },
  "timezone": "Asia/Dhaka",
  "problemsAdded": 24,
  "problemsAttempted": 31,
  "solvedIndependently": 19,
  "mastered": 7,
  "revisionCompletion": {
    "completedOnTime": 41,
    "dueTotal": 48,
    "rate": 85.42
  },
  "averageSolveTime": {
    "firstAttempt": { "averageMinutes": 34.71, "count": 24 },
    "revision": { "averageMinutes": 12.4, "count": 57 }
  },
  "recallCoverage": {
    "attemptedProblems": 31,
    "withCard": 22,
    "needsUpdate": 4,
    "rate": 70.97
  }
}
```

`range.from` / `range.to` echo back `null` when you didn't supply them.

**Errors.** `400` on a malformed date, inverted range, or a span over 365 days; `401`.

**UI note.** Render `rate: null` as "—" or "No revisions have come due yet", never as `0%`. The same
applies to `recallCoverage.rate`. The gap `attemptedProblems − withCard` is directly actionable —
link it to `/problems?hasRecallCard=false`, and `needsUpdate` to a stale-cards view.

---

#### `GET /api/insights/topics`

**Purpose.** Per-topic performance and the derived list of weak topics — the "what should I study
next" view.

**Auth.** Yes.

**Input.** **None.** This endpoint takes no query parameters and is always all-time. Sending `from`/`to`
has no effect.

**Behaviour.** Aggregates attempts per topic across the owner's problems. A topic is flagged `weak`
when it has **at least `minAttempts` attempts** _and_ (`independentSolveRate < solveRate` **or**
`averageConfidence < confidence`). The thresholds come from server config and are returned in the
response so the UI can explain the rule. `weakTopics` is the `weak` subset sorted worst-first (by
solve rate, then confidence).

Defaults: `minAttempts: 5`, `solveRate: 60` (percent), `confidence: 3`.

**Success `200`** — `data: TopicInsights`:

```json
{
  "topics": [
    {
      "id": "0a12…",
      "slug": "dynamic-programming",
      "name": "Dynamic Programming",
      "problemCount": 17,
      "attemptCount": 39,
      "independentSolveRate": 43.59,
      "averageConfidence": 2.74,
      "averageMinutes": 41.2,
      "weak": true
    }
  ],
  "weakTopics": [/* the weak subset, worst first */],
  "thresholds": { "minAttempts": 5, "solveRate": 60, "confidence": 3 }
}
```

`independentSolveRate` is a **percentage 0–100**, not a 0–1 fraction — don't multiply it again. It is
`null` when the topic has no attempts. `averageConfidence` and `averageMinutes` are `null` for
untouched topics. `topics` is ordered by `problemCount` descending, then name.

**Errors.** `401`.

---

#### `GET /api/insights/patterns`

**Purpose.** The same analysis as `/insights/topics`, but over the owner's **techniques** rather than
subject areas — "which patterns am I still weak at", which is the more actionable question for
interview prep.

**Auth.** Yes.

**Input.** **None.** No query parameters; always all-time.

**Behaviour.** Identical to `/insights/topics` in every respect — same aggregation, same weak-flag
rule, same worst-first ordering — including **the same configured thresholds**. There is no separate
`weak_pattern_*` config. Only the vocabulary being aggregated differs.

**Success `200`** — `data: PatternInsights`. The entry shape is byte-for-byte the same as
`TopicInsight`; only the two array keys are renamed:

```json
{
  "patterns": [
    {
      "id": "7c40…",
      "slug": "monotonic-stack",
      "name": "Monotonic Stack",
      "problemCount": 9,
      "attemptCount": 21,
      "independentSolveRate": 38.1,
      "averageConfidence": 2.4,
      "averageMinutes": 48.6,
      "weak": true
    }
  ],
  "weakPatterns": [/* the weak subset, worst first */],
  "thresholds": { "minAttempts": 5, "solveRate": 60, "confidence": 3 }
}
```

**Coverage caveat worth surfacing in the UI.** Patterns are tagged by hand, so early on most problems
have none and this list will be short — that is thin data, not strength. A pattern tagged only on
never-attempted problems is returned with `attemptCount: 0`, `null` rates, and `weak: false`. Consider
showing `recallCoverage` from the summary alongside this chart so a sparse result reads as "tag more
cards", not "you're doing fine".

**Errors.** `401`.

**Next.js usage.** Render it beside the topics card — the two components can be identical apart from
the endpoint and the key names:

```tsx
const [topics, patterns] = await Promise.all([
  apiFetch<TopicInsights>('/api/insights/topics'),
  apiFetch<PatternInsights>('/api/insights/patterns'),
])
```

---

#### `GET /api/insights/activity`

**Purpose.** The attempts-per-day heatmap / calendar.

**Auth.** Yes.

**Query.** `from`, `to`. **Defaults when omitted:** `to` defaults to today; `from` defaults to
`to - 364 days` — i.e. a trailing **365-day** window. (Different default from `backlog`.)

**Behaviour.** Groups attempts by local calendar day in the owner's timezone (done in Postgres, not in
Node). **Days with zero attempts are included** with `count: 0`, so the client can render a
contiguous heatmap without filling gaps itself.

**Success `200`** — `data: ActivityInsights`:

```json
{
  "range": { "from": "2025-08-09", "to": "2026-08-08" },
  "timezone": "Asia/Dhaka",
  "days": [
    { "date": "2025-08-09", "count": 0 },
    { "date": "2025-08-10", "count": 3 }
  ]
}
```

Unlike `summary`, `range.from`/`range.to` here are **always concrete dates** (the resolved defaults),
never `null`.

**Errors.** `400` malformed/inverted/over-long range; `401`.

---

#### `GET /api/insights/backlog`

**Purpose.** Overdue debt over time — is the backlog growing or shrinking?

**Auth.** Yes.

**Query.** `from`, `to`. **Defaults when omitted:** `to` defaults to today; `from` defaults to
`to - 29 days` — i.e. a trailing **30-day** window.

**Behaviour.** `overdueCount` is the **current** overdue total (problems whose `nextDueAt` is before
the start of today). `trend` is the overdue count as at the **end of each local day** in the range:
a stage occurrence counts as overdue at the end of day D when it fell due strictly before D and was
still unresolved at the end of D. Every day in the range is present.

**Success `200`** — `data: BacklogInsights`:

```json
{
  "range": { "from": "2026-07-10", "to": "2026-08-08" },
  "timezone": "Asia/Dhaka",
  "overdueCount": 2,
  "trend": [
    { "date": "2026-07-10", "overdueCount": 5 },
    { "date": "2026-07-11", "overdueCount": 4 }
  ]
}
```

**Errors.** `400` malformed/inverted/over-long range; `401`.

**Next.js usage.** Fetch all four in parallel and stream each card independently:

```tsx
// app/(app)/insights/page.tsx
import { Suspense } from 'react'

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const range = await searchParams

  return (
    <main>
      <RangePicker />
      <Suspense fallback={<CardSkeleton />}>
        <SummaryCard range={range} />
      </Suspense>
      <Suspense fallback={<CardSkeleton />}>
        <ActivityHeatmap range={range} />
      </Suspense>
      <Suspense fallback={<CardSkeleton />}>
        <BacklogChart range={range} />
      </Suspense>
      <Suspense fallback={<CardSkeleton />}>
        <WeakTopics />
      </Suspense>
    </main>
  )
}
```

Each child `await`s its own `apiFetch`, so all four requests start in parallel and each card renders
as soon as its own data lands.

---

### 8.9 Settings

---

#### `GET /api/settings`

**Purpose.** The owner's settings — most importantly the **timezone**, which governs every local-day
computation in the product.

**Auth.** Yes.

**Input.** None.

**Behaviour.** Settings are **created lazily with defaults on first read**, so this endpoint never
404s and no endpoint can fail because settings were never initialized. Defaults: `timezone: "UTC"`,
`notificationsEnabled: false`, `reminderTime: "20:00"`.

**Success `200`** — `data: UserSettings`:

```json
{
  "id": "77aa…",
  "userId": "b4f0…",
  "timezone": "Asia/Dhaka",
  "notificationsEnabled": true,
  "reminderTime": "20:00",
  "lastAcknowledgedDate": "2026-08-07",
  "createdAt": "2026-06-01T09:00:00.000Z",
  "updatedAt": "2026-08-07T14:02:11.000Z"
}
```

**Errors.** `401`.

---

#### `PATCH /api/settings`

**Purpose.** Change the timezone, toggle notifications, or move the daily reminder time.

**Auth.** Yes.

**Request body.** All optional, **at least one required** (`400` otherwise:
`"Provide at least one of timezone, notificationsEnabled, reminderTime"`).

| Field                  | Type      | Rules                                                                                                                     |
| ---------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------- |
| `timezone`             | `string`  | A valid **IANA identifier**, e.g. `"Asia/Dhaka"`, `"America/New_York"`. Validated against the runtime's timezone database |
| `notificationsEnabled` | `boolean` | JSON boolean, not a string                                                                                                |
| `reminderTime`         | `string`  | 24-hour `HH:mm`, zero-padded — `"08:00"` ✅, `"8:00"` ❌, `"24:00"` ❌                                                    |

```json
{
  "timezone": "Asia/Dhaka",
  "notificationsEnabled": true,
  "reminderTime": "21:30"
}
```

**Behaviour.** Ensures the settings row exists (so a first write doesn't 404), then applies the
partial update. `lastAcknowledgedDate` is **not** settable here — it's owned by the reminder
acknowledge endpoint.

**Success `200`** — `data: UserSettings` (the full updated row).

**Errors.** `400` empty body, invalid IANA timezone, bad `HH:mm`, non-boolean flag; `401`.

> 🔁 **Changing `timezone` re-derives every date in the product** — due dates, streaks, activity
> buckets, the dashboard's "today", reminder timing. After a successful timezone change, revalidate
> **everything**: `revalidatePath('/', 'layout')`.

**Next.js usage**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { ApiError, apiFetch } from '@/lib/api/http'
import type { UserSettings } from '@/lib/api/types'

export async function updateSettings(
  _prev: { message?: string; fieldErrors?: Record<string, string> },
  formData: FormData,
) {
  const timezone = formData.get('timezone')?.toString()
  const reminderTime = formData.get('reminderTime')?.toString()

  const body = {
    ...(timezone ? { timezone } : {}),
    ...(reminderTime ? { reminderTime } : {}),
    notificationsEnabled: formData.get('notificationsEnabled') === 'on',
  }

  try {
    await apiFetch<UserSettings>('/api/settings', { method: 'PATCH', body })
  } catch (error) {
    if (error instanceof ApiError) {
      return { message: error.message, fieldErrors: error.fieldErrors }
    }
    throw error
  }

  revalidatePath('/', 'layout') // a timezone change moves every date in the app
  return { message: 'Settings saved.' }
}
```

Populate the timezone `<select>` from `Intl.supportedValuesOf('timeZone')` in a Client Component, and
default it to `Intl.DateTimeFormat().resolvedOptions().timeZone` **only as a suggestion for the
picker** — never as a substitute for the stored value.

---

### 8.10 Reminders

There is **no scheduler and no server push**. The reminder decision is computed on request; it is only
ever available to a client that asks for it. Closed-browser delivery is explicitly out of scope.

---

#### `GET /api/reminders/current`

**Purpose.** Should a reminder be shown right now, and what should it say?

**Auth.** Yes.

**Input.** None.

**Behaviour.** Computes, against the owner's timezone and the current instant:

- `active` = `notificationsEnabled` **AND** the local time is at or past `reminderTime` **AND**
  `dueTomorrow > 0`. Because `HH:mm` strings compare lexicographically, once the time has passed the
  reminder stays active for the remainder of that local day.
- `acknowledged` = `lastAcknowledgedDate === today`. Stored as a **local date**, so it resets by
  itself at local midnight.
- `dueTomorrow`, `dueToday`, `overdueToday` are counts over `nextDueAt`. Mastered and never-attempted
  problems (null `nextDueAt`) are excluded from all three.
- `notification` is pre-rendered copy shared by the in-app banner and the browser Notification, so the
  wording lives in one place. `targetPath` is `/dashboard/today` — **map this to your own route** if
  your dashboard lives elsewhere.

**Success `200`** — `data: ReminderState`:

```json
{
  "active": true,
  "localDate": "2026-08-08",
  "timezone": "Asia/Dhaka",
  "reminderTime": "20:00",
  "notificationsEnabled": true,
  "dueTomorrow": 4,
  "dueToday": 3,
  "overdueToday": 2,
  "acknowledged": false,
  "notification": {
    "title": "ReSolve revision reminder",
    "body": "You have 4 problems due for revision tomorrow.",
    "targetPath": "/dashboard/today"
  }
}
```

**Show the banner when `active && !acknowledged`.**

**Errors.** `401`.

**Next.js usage.** Render the banner server-side, and refresh with `router.refresh()` on an interval
if the page stays open past `reminderTime`. Keep the interval generous — every call is an
authenticated request that writes `lastActiveAt`:

```tsx
// app/(app)/_components/reminder-banner.tsx (Server Component)
import { apiFetch } from '@/lib/api/http'
import type { ReminderState } from '@/lib/api/types'
import { AcknowledgeButton } from './acknowledge-button'
import { ReminderRefresher } from './reminder-refresher'

export async function ReminderBanner() {
  const { data } = await apiFetch<ReminderState>('/api/reminders/current')
  if (!data.active || data.acknowledged) return <ReminderRefresher />

  return (
    <div role="status" aria-live="polite">
      <strong>{data.notification.title}</strong>
      <p>{data.notification.body}</p>
      <AcknowledgeButton
        title={data.notification.title}
        body={data.notification.body}
      />
      <ReminderRefresher />
    </div>
  )
}
```

```tsx
// app/(app)/_components/reminder-refresher.tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const FIVE_MINUTES = 5 * 60 * 1000

export function ReminderRefresher() {
  const router = useRouter()

  useEffect(() => {
    const id = setInterval(() => router.refresh(), FIVE_MINUTES)
    const onVisible = () =>
      document.visibilityState === 'visible' && router.refresh()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [router])

  return null
}
```

For a real browser notification, request permission from a Client Component (it requires a user
gesture) and fire `new Notification(title, { body })` using the copy from the API — never invent your
own wording.

---

#### `POST /api/reminders/acknowledge`

**Purpose.** Dismiss today's reminder.

**Auth.** Yes.

**Input.** No body, no query parameters.

**Behaviour.** Writes `lastAcknowledgedDate = today` (a local date) and then returns the **freshly
recomputed reminder state**. Acknowledging when nothing is active is harmless and idempotent.
Acknowledgement resets automatically when the owner's local date rolls over.

**Success `200`** — `data: ReminderState` (same shape as `GET /current`, now with
`acknowledged: true`).

**Errors.** `401`.

**Next.js usage**

```ts
// app/(app)/_components/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { apiFetch } from '@/lib/api/http'
import type { ReminderState } from '@/lib/api/types'

export async function acknowledgeReminder() {
  await apiFetch<ReminderState>('/api/reminders/acknowledge', {
    method: 'POST',
  })
  revalidatePath('/', 'layout') // the banner lives in the layout
}
```

```tsx
// app/(app)/_components/acknowledge-button.tsx
'use client'

import { useTransition } from 'react'
import { acknowledgeReminder } from './actions'

export function AcknowledgeButton() {
  const [pending, startTransition] = useTransition()

  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => acknowledgeReminder())}
    >
      {pending ? 'Dismissing…' : 'Got it'}
    </button>
  )
}
```

---

### 8.11 Recall cards

The durable knowledge record for a problem — one card each, freely rewritten, **never** read by the
revision engine. Read [§1.5](#15-recall-cards-are-knowledge-attempts-are-history) first; the
full-replacement semantics catch people out.

---

#### `PUT /api/problems/:id/recall`

**Purpose.** Create or replace a problem's recall card, and with it the problem's pattern tags.

**Auth.** Yes.

**Path params.** `id` — problem UUID.

**Request body** — `RecallCardInput`.

| Field             | Type              | Rules                                                                            |
| ----------------- | ----------------- | -------------------------------------------------------------------------------- |
| `keyInsight`      | `string`          | **Required.** 1–`MAX_KEY_INSIGHT_LENGTH` (default **280**) chars after trimming  |
| `approach`        | `string \| null`  | ≤ `MAX_APPROACH_LENGTH` (default 4000)                                           |
| `pitfalls`        | `string \| null`  | ≤ `MAX_PITFALLS_LENGTH` (default 2000)                                           |
| `timeComplexity`  | `string \| null`  | ≤ `MAX_COMPLEXITY_LENGTH` (default 40), free text — `"O(n log n)"`               |
| `spaceComplexity` | `string \| null`  | ≤ `MAX_COMPLEXITY_LENGTH` (default 40)                                           |
| `patterns`        | `string[]`        | Pattern **display names**, not slugs. Each 1–`MAX_PATTERN_NAME_LENGTH` (60) chars |

```json
{
  "keyInsight": "Expand around each centre; a palindrome is symmetric about one index or one gap",
  "approach": "For each i, expand (i, i) and (i, i+1) while the ends match.",
  "pitfalls": "Forgetting the even-length centre.",
  "timeComplexity": "O(n^2)",
  "spaceComplexity": "O(1)",
  "patterns": ["Two Pointers", "Expand Around Centre"]
}
```

> **This is a `PUT`. Omitted fields are cleared, not preserved.** Sending
> `{ "keyInsight": "…" }` against an existing card wipes its approach, pitfalls, complexities **and
> all its patterns**. Your edit form must submit every field, pre-filled from the current card.

**Behaviour.** Verifies the problem belongs to the owner, then upserts the card and replaces the
pattern set in **one transaction** — patterns are created on demand, and casing/spacing variants
resolve to an existing pattern (`"sliding  window"` → `sliding-window`). The card row is always
written even when nothing changed, so `updatedAt` advances and any stale flag clears.

**Success `201`** when no card existed, **`200`** when one was replaced — `data: RecallCard`. Branch
your toast on the status code, not on the body. `needsRecallUpdate` is always `false` in this response
(you just wrote the card, so it cannot be stale).

**Errors**

| Status | Cause                                                                                       |
| ------ | ------------------------------------------------------------------------------------------- |
| `400`  | Missing/blank `keyInsight`; any field over its limit; a pattern name that slugifies to nothing |
| `404`  | Unknown problem id, or not the owner's                                                       |
| `401`  | Bad token                                                                                    |

**Next.js usage**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { apiFetch } from '@/lib/api/http'
import type { RecallCard, RecallCardInput } from '@/lib/api/types'

export async function saveRecallCard(problemId: string, input: RecallCardInput) {
  await apiFetch<RecallCard>(`/api/problems/${problemId}/recall`, {
    method: 'PUT',
    body: input, // send every field — this is a full replace
  })

  revalidatePath(`/problems/${problemId}`)
  revalidatePath('/problems') // hasRecallCard / needsRecallUpdate badges
  revalidatePath('/recall') // the sheet
  revalidatePath('/patterns') // counts may have shifted
  // NOT /dashboard — a card never moves a due date.
}
```

---

#### `GET /api/problems/:id/recall`

**Purpose.** Fetch one card standalone — for an edit form loaded on its own route, say.

**Auth.** Yes.

**Behaviour.** Returns the card with its patterns and a freshly derived `needsRecallUpdate`.

**Success `200`** — `data: RecallCard`.

**Errors.** `404` in two different cases, distinguishable only by `message`: `"This problem has no
recall card yet"` when the problem exists but is unwritten, and `"Record not found"` when the problem
id is unknown. Branch on the message if the distinction matters to your empty state. `401` on a bad
token.

> Most UIs never need this endpoint: `GET /api/problems/:id` already embeds the card. Reach for it
> only when you're loading the editor without the detail page.

---

#### `DELETE /api/problems/:id/recall`

**Purpose.** Discard a problem's written-up knowledge.

**Auth.** Yes.

**Behaviour.** Deletes the card **and unlinks all of the problem's patterns** in one transaction —
patterns are authored as part of the card, so they go with it. Attempts, the schedule, `currentStage`,
`nextDueDate`, and `practiceState` are all untouched.

**Success `200`** — `data: { "problemId": "9a1c…" }`.

**Errors.** `404` when there is no card (a second delete is a `404`); `401`.

**UI note.** Confirm before calling — this silently discards the pattern tags too, which users won't
expect. Say so in the dialog.

---

#### `GET /api/recall/sheet`

**Purpose.** Every card the owner has written, grouped by pattern — the pre-interview skim. This is
the "review by technique instead of by problem" view.

**Auth.** Yes.

**Query parameters** (all optional, combined **conjunctively**)

| Param        | Type                            | Notes                                                      |
| ------------ | ------------------------------- | ---------------------------------------------------------- |
| `pattern`    | comma-separated pattern slugs   | Narrows to those groups only                                |
| `topic`      | comma-separated topic slugs     |                                                             |
| `difficulty` | single `Difficulty`             | Not CSV — one value                                         |
| `status`     | single `PracticeState`          | Not CSV. Evaluated against today in the owner's timezone    |

**Behaviour.** Cards are grouped by pattern, groups ordered by card count descending then name.
Problems with **no card are excluded entirely** — this is a knowledge view, not a problem list.

- A problem tagged with several patterns **appears under each of them**. That duplication is
  intentional; do not de-duplicate across groups, and don't sum `cards.length` to get a problem count.
- Cards with no pattern land in a trailing group with **`slug: null`** and `name: "Untagged"`. Always
  render it last and handle the null slug — it is not a real pattern and has no detail page.
- Bounded by `RECALL_SHEET_CAP` (default **500** cards) with no pagination; check `truncated`.

**Success `200`** — `data: RecallSheet`:

```json
{
  "groups": [
    {
      "slug": "two-pointers",
      "name": "Two Pointers",
      "cards": [
        {
          "problemId": "9a1c…",
          "title": "Longest Palindromic Substring",
          "difficulty": "MEDIUM",
          "practiceState": "SCHEDULED",
          "keyInsight": "Expand around each centre…",
          "timeComplexity": "O(n^2)",
          "spaceComplexity": "O(1)",
          "needsRecallUpdate": false
        }
      ]
    },
    { "slug": null, "name": "Untagged", "cards": [] }
  ],
  "totalCards": 22,
  "truncated": false
}
```

`totalCards` counts **distinct cards returned**, not the sum of group sizes — those differ whenever a
problem carries more than one pattern. (A single card tagged `Doc A` and `Doc B` yields
`totalCards: 1` across two groups of one.) Use `totalCards` for "you have written N cards"; never sum
the groups.

**Errors.** `400` on an invalid `difficulty` or `status`; `401`.

---

### 8.12 Patterns

The owner-authored technique vocabulary. Structurally a twin of [§8.6 Topics](#86-topics) — same
normalization, same rename-that-merges — but a **separate vocabulary with separate endpoints**, and
created only through a recall card. See [§1.5](#15-recall-cards-are-knowledge-attempts-are-history)
for why they are not the same thing.

---

#### `GET /api/patterns`

**Purpose.** The pattern vocabulary, for filter chips, tag autocomplete on the card editor, and the
pattern management page.

**Auth.** Yes.

**Query parameters**

| Param      | Type     | Notes                                                                                            |
| ---------- | -------- | ------------------------------------------------------------------------------------------------ |
| `usedOnly` | `"true"` | The **literal string `"true"`**, exactly as on `/api/topics`. Any other value is treated as false |

**Behaviour.** Every pattern with its problem count, ordered by count descending then name ascending.

**Success `200`** — `data: PatternWithCount[]`:

```json
[
  { "id": "7c40…", "slug": "two-pointers", "name": "Two Pointers", "problemCount": 14 },
  { "id": "7c41…", "slug": "monotonic-stack", "name": "Monotonic Stack", "problemCount": 9 }
]
```

**Note.** The `slug` is what `GET /api/problems?pattern=` and `GET /api/recall/sheet?pattern=` expect —
filter by slug, display `name`. But `PUT .../recall` takes **names**, not slugs.

**UI note.** Because patterns are typed by hand, near-duplicates accumulate (`two-pointer` alongside
`two-pointers`). Count-descending ordering makes the singletons pool at the bottom of this list —
that's the cue to merge them with a rename.

**Errors.** `401`.

---

#### `PATCH /api/patterns/:id`

**Purpose.** Rename a pattern — and, implicitly, **merge** two patterns.

**Auth.** Yes.

**Request body**

| Field  | Type     | Rules                                                         |
| ------ | -------- | ------------------------------------------------------------- |
| `name` | `string` | 1–`MAX_PATTERN_NAME_LENGTH` (default 60) chars after trimming |

**Behaviour.** Identical to `PATCH /api/topics/:id`: normalizes to a slug, then either updates in
place or — on a collision with a different pattern — moves every link to the survivor, collapses
duplicates, **deletes** the renamed row, and returns the **survivor**. The `id` you get back may not
be the `id` you sent.

**Success `200`** — `data: Pattern` (full row).

**Errors**

| Status | Cause                                                                        |
| ------ | ---------------------------------------------------------------------------- |
| `400`  | Empty/whitespace-only name, too long, or a name that slugifies to nothing    |
| `404`  | Unknown pattern id                                                           |
| `401`  | Bad token                                                                    |

**UI note.** Same warning as topics — "This will merge <A> into <B>" — and revalidate `/patterns`,
`/problems`, and the recall sheet afterwards. There is no create and no delete endpoint: a pattern
appears when a card first names it, and is left behind with `problemCount: 0` when the last card
drops it.

---

### 8.13 Search

---

#### `GET /api/search`

**Purpose.** Find a problem by something the owner **wrote** — a phrase from an attempt note, a line
from a recall card, a technique name — rather than by title. This is the endpoint that makes months of
accumulated notes retrievable; `GET /api/problems?search=` only matches titles.

**Auth.** Yes.

**Query parameters**

| Param   | Type                                                | Default | Notes                                                    |
| ------- | --------------------------------------------------- | ------- | -------------------------------------------------------- |
| `q`     | `string`                                            | —       | **Required.** `SEARCH_MIN_QUERY_LENGTH` (default 2)–200 chars |
| `scope` | `problem` \| `recall` \| `attempt` \| `vocabulary`  | all     | Single value, not CSV                                    |
| `page`  | integer ≥ 1                                         | `1`     |                                                          |
| `limit` | integer 1–`MAX_PAGE_SIZE`                           | `20`    |                                                          |

Scopes map to fields: `problem` → title + statement; `recall` → key insight, approach, pitfalls;
`attempt` → notes; `vocabulary` → topic and pattern names.

**Behaviour.** Case-insensitive **substring** matching (not full-text — there is no stemming, so
`"pointer"` will not match `"pointers"` in the other direction, but `"point"` matches both). Each
problem is returned **once** no matter how many fields or attempts matched, with every match listed in
`matches`.

- **Ordering is by field priority**, not relevance score:
  `title > pattern > topic > keyInsight > approach > pitfalls > statement > attemptNote`.
  A problem is ranked by its **highest-priority** match, ties broken by most recently updated then id.
  Ordering is deterministic for a given query and data set.
- **`%` and `_` are matched literally.** They are escaped before the query runs, so a search for
  `"O(n%)"` does what the user meant.
- **Bounded** at `SEARCH_RESULT_CAP` (default **200**) candidate problems. `meta.truncated` is `true`
  when the cap stopped the scan short — surface "showing the first 200 matches, narrow your search"
  rather than silently showing a partial set. `page`/`limit` paginate **within** that bound, so
  `meta.total` is the matched-and-scored count, never the true library-wide total when truncated.
- Snippets are ~`SEARCH_SNIPPET_LENGTH` (default 160) chars, centred on the match and trimmed to word
  boundaries, with `…` where text was cut.

**Success `200`** — `data: SearchResult[]`, plus `meta`:

```jsonc
{
  "success": true,
  "statusCode": 200,
  "message": "Search results retrieved successfully",
  "meta": { "page": 1, "limit": 20, "total": 3, "totalPages": 1, "truncated": false },
  "data": [
    {
      "id": "9a1c…",
      "title": "Trapping Rain Water",
      "source": "LEETCODE",
      "difficulty": "HARD",
      "practiceState": "OVERDUE",
      "topics": [{ "slug": "array", "name": "Array" }],
      "patterns": [{ "slug": "monotonic-stack", "name": "Monotonic Stack" }],
      "matches": [
        { "field": "pattern", "snippet": "Monotonic Stack" },
        {
          "field": "attemptNote",
          "snippet": "…forgot the monotonic stack has to be decreasing…",
          "attemptedAt": "2026-07-14T09:12:00.000Z",
        },
      ],
    },
  ],
}
```

`matches` is never empty, and `attemptedAt` is present **only** on `attemptNote` matches — use it to
label the snippet with when the note was written.

**Errors**

| Status | Cause                                                          |
| ------ | -------------------------------------------------------------- |
| `400`  | Missing `q`, `q` shorter than the minimum, over 200 chars      |
| `400`  | `scope` outside the four permitted values; bad `page`/`limit`  |
| `401`  | Bad token                                                      |

**Next.js usage.** Search is a user-typed query, so don't cache it. Drive it from `searchParams` so
results are linkable, and debounce the input on the client:

```tsx
// app/(app)/search/page.tsx
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; scope?: string; page?: string }>
}) {
  const { q, scope, page } = await searchParams

  // Below the minimum length the API 400s — render the empty state instead.
  if (!q || q.trim().length < 2) return <SearchEmptyState />

  const { data, meta } = await apiFetch<SearchResult[]>('/api/search', {
    query: { q, scope, page: page ?? 1, limit: 20 },
    cache: 'no-store',
  })

  return (
    <>
      {meta?.truncated && <TruncationNotice />}
      <SearchResults results={data} query={q} />
    </>
  )
}
```

Highlight matches by finding `q` case-insensitively inside `snippet` — the backend does not return
offsets or markup, and the snippet is plain text that must be escaped before rendering.

---

## 9. Suggested frontend folder structure

```
proxy.ts                          # (Next 16) auth guard + token refresh; middleware.ts on 15
app/
├── layout.tsx
├── error.tsx
├── not-found.tsx
├── (auth)/
│   └── login/
│       ├── page.tsx              # Server Component, renders LoginForm
│       ├── login-form.tsx        # 'use client' + useActionState
│       └── actions.ts            # 'use server' — login, writes session cookies
└── (app)/
    ├── layout.tsx                # shell + <ReminderBanner /> + nav
    ├── dashboard/
    │   ├── page.tsx              # GET /api/dashboard/today, Suspense-streamed
    │   └── loading.tsx
    ├── problems/
    │   ├── page.tsx              # GET /api/problems, filters from searchParams
    │   ├── loading.tsx
    │   ├── actions.ts            # capture / update / delete problem
    │   ├── new/
    │   │   ├── page.tsx          # capture flow
    │   │   └── actions.ts        # preview + capture
    │   └── [id]/
    │       ├── page.tsx          # GET /api/problems/:id — embeds the recall card
    │       ├── error.tsx
    │       ├── actions.ts        # log/edit/delete attempt, reschedule
    │       └── recall/
    │           ├── page.tsx      # card editor (GET .../recall if loaded directly)
    │           └── actions.ts    # PUT / DELETE .../recall
    ├── topics/
    │   ├── page.tsx              # GET /api/topics
    │   └── actions.ts            # rename/merge
    ├── patterns/
    │   ├── page.tsx              # GET /api/patterns
    │   └── actions.ts            # rename/merge — same UI as topics
    ├── recall/
    │   └── page.tsx              # GET /api/recall/sheet — review by technique
    ├── search/
    │   └── page.tsx              # GET /api/search, query from searchParams
    ├── insights/
    │   └── page.tsx              # five parallel Suspense-streamed cards
    ├── settings/
    │   ├── page.tsx              # GET /api/settings
    │   └── actions.ts            # PATCH /api/settings
    └── _components/              # private folder, not routable
        ├── reminder-banner.tsx
        ├── reminder-refresher.tsx
        ├── acknowledge-button.tsx
        └── recall-card-form.tsx  # shared by the editor — submits ALL fields
lib/
└── api/
    ├── types.ts                  # §5
    ├── http.ts                   # §6 — 'server-only'
    ├── tags.ts                   # cache tag constants
    ├── problems.ts               # cache()-wrapped readers
    ├── dashboard.ts
    ├── insights.ts
    ├── recall.ts                 # card + sheet readers
    ├── search.ts                 # no-store, never cache()-wrapped
    └── settings.ts
```

---

## 10. Gotchas checklist

Run through this before you ship. Every item is a real property of this API, not a hypothetical.

**Auth**

- [ ] `Authorization` header carries the **raw JWT with no `Bearer ` prefix**.
- [ ] The API's own cookies use `SameSite=None; Secure=false` — unusable from a browser. Hold the
      session in Next.js's own cookies and call the API server-side.
- [ ] `API_BASE_URL` is **not** `NEXT_PUBLIC_`. The browser must never see the token.
- [ ] The backend's `APP_URL` must equal your Next.js origin or CORS blocks browser calls.
- [ ] Refresh tokens **rotate** — refresh in exactly one place (`proxy.ts`), never concurrently, and
      never as a 401-retry inside the fetch client (Server Components cannot set cookies).
- [ ] Login `404` and `401` both mean "bad credentials" in the UI.

**Dates**

- [ ] `*Date` fields are `yyyy-MM-dd` local dates; `*At` fields are UTC instants. Don't mix them.
- [ ] Never `new Date("2026-08-08").toLocaleDateString()` — off-by-one for most timezones.
- [ ] `<input type="date">` already produces `yyyy-MM-dd`; send it verbatim to `reschedule`.
- [ ] Use the `timezone` from the API, not the browser's.

**Requests**

- [ ] `durationMinutes` and `confidence` must be JSON **numbers**; the schemas don't coerce strings.
- [ ] `notificationsEnabled` must be a JSON **boolean**.
- [ ] `solutionViewed` and `hasRecallCard` in the problems query are the **strings** `"true"`/`"false"`.
- [ ] `difficulty`, `status`, `topic`, and `pattern` in the problems query are **comma-separated
      strings**, not repeated params.
- [ ] `usedOnly` on `/api/topics` and `/api/patterns` must be the literal string `"true"`.
- [ ] All `PATCH` bodies reject an empty object — send at least one field.
- [ ] `PATCH /api/problems/:id` with `topics` **replaces** the whole set — send the full list.
- [ ] `PUT`, not `PATCH`, for `/api/users/my-profile`.
- [ ] `attemptedAt` cannot be in the future.
- [ ] `reason` is mandatory on reschedule.

**Recall layer**

- [ ] `PUT .../recall` is a **full replace** — an omitted field is cleared, and an omitted `patterns`
      list wipes every pattern. Submit the whole card from the edit form, always.
- [ ] `keyInsight` is **required** and capped at 280 chars — enforce it in the form, not just on submit.
- [ ] `patterns` on the card takes **display names**; `?pattern=` filters take **slugs**. Don't cross them.
- [ ] `patterns` is stripped by `POST`/`PATCH /api/problems`. A `PATCH` of **only** `patterns` is a
      `400` (empty after stripping); alongside another field it's a silent no-op.
- [ ] `DELETE .../recall` also removes the problem's patterns — say so in the confirm dialog.
- [ ] `PUT .../recall` returns **`201` on create, `200` on replace** — branch on the status, not the body.
- [ ] `needsRecallUpdate` is derived per read like `practiceState`; never persist or recompute it.
- [ ] `recallCard` on the detail response carries neither `patterns` nor `needsRecallUpdate` — both are
      top-level on the problem.
- [ ] Card mutations must **not** invalidate `/dashboard`; they cannot change a due date.
- [ ] The recall sheet's untagged group has **`slug: null`** — handle it before linking to a pattern page.
- [ ] The same problem appears under **every** pattern it carries on the sheet; don't sum group sizes.
- [ ] `PATCH /api/patterns/:id` can **merge and delete**, exactly like topics — the returned `id` may differ.

**Search**

- [ ] `q` is required and must be **≥ 2 chars** — render an empty state below that instead of calling.
- [ ] `scope` is a **single** value, not CSV.
- [ ] Check `meta.truncated`; when true, `meta.total` is the capped count, not the library-wide total.
- [ ] Ordering is **field priority**, not relevance — don't re-sort client-side and expect it to match.
- [ ] `attemptedAt` appears only on `attemptNote` matches.
- [ ] Snippets are plain text — escape before rendering, and highlight by finding `q` yourself.
- [ ] Never cache search responses.

**Responses**

- [ ] Error bodies have **no `statusCode` field** — read it from the HTTP response.
- [ ] Field-level errors live in `errorDetails.issues[]`, Title-Cased; the top-level `message` is a
      concatenation not fit for display.
- [ ] `POST /api/problems` returns **`200` with `alreadyExisted: true`** for a duplicate URL — that is
      a success, not an error. Branch the UI on it.
- [ ] A `422` from preview/capture means "let the user type the metadata"; `errorDetails.canonicalUrl`
      pre-fills the form.
- [ ] `PATCH /api/topics/:id` can **merge and delete** — the returned `id` may differ from the one you
      sent.
- [ ] `revisionCompletion.rate`, `recallCoverage.rate`, and every `average*` field can be `null`;
      render "—", never `0`.
- [ ] `independentSolveRate` is already a percentage (0–100).
- [ ] `recallCoverage` is **lifetime**, not windowed by the insights date range — don't label it with
      the selected range.
- [ ] `RevisionEvent.id` is unstable across replays — don't use it as a persistent key.
- [ ] `dashboard.recommended` is a slice of `due`, not a separate set — don't render both as if they
      were disjoint.

**Caching**

- [ ] Reads default to `cache: 'no-store'`; every response is per-user and expires at local midnight.
- [ ] Every authenticated request writes `lastActiveAt` — poll at minutes, never seconds.
- [ ] `revalidatePath` after every mutation; a timezone change needs `revalidatePath('/', 'layout')`.
- [ ] `useSearchParams()` in a Client Component requires a `<Suspense>` boundary or the route bails to
      CSR.

**Next.js**

- [ ] `params` and `searchParams` are `Promise`s — `await` them (or `use()` in a sync component).
- [ ] `cookies()` and `headers()` are async — `await` them.
- [ ] Call `redirect()` / `notFound()` **outside** `try`/`catch`, or re-throw with
      `unstable_rethrow`.
- [ ] Next 16 uses `proxy.ts` / `proxy()` / `proxyConfig`; Next 15 uses `middleware.ts` /
      `middleware()` / `config`.
