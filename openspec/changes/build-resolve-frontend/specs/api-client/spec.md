## ADDED Requirements

### Requirement: Server-only API client
The system SHALL expose a single typed `apiFetch` wrapper in `lib/api/http.ts` marked with the `server-only` package, so that importing it from a Client Component is a build-time error and the access token can never reach the browser.

#### Scenario: Client Component imports the client
- **WHEN** a module carrying the `'use client'` directive imports `lib/api/http.ts`
- **THEN** the build fails with the `server-only` error rather than shipping the token to the browser

#### Scenario: Server Component reads data
- **WHEN** a Server Component awaits `apiFetch<TodayDashboard>('/api/dashboard/today')`
- **THEN** the request is issued from the Next.js server with the owner's access token and the parsed `data` is returned

### Requirement: Raw JWT authorization header
The client SHALL send the access token as the raw JWT value of the `Authorization` header with **no `Bearer ` prefix**, because the backend verifies the header value directly.

#### Scenario: Authenticated request
- **WHEN** `apiFetch` runs and the `resolve_access` cookie holds `eyJhbGciOi...`
- **THEN** the outbound request carries `Authorization: eyJhbGciOi...` and not `Authorization: Bearer eyJhbGciOi...`

#### Scenario: No token present
- **WHEN** the `resolve_access` cookie is absent
- **THEN** no `Authorization` header is sent and the resulting `401` surfaces as an `ApiError` with `isUnauthorized === true`

### Requirement: Envelope handling
The client SHALL treat the success envelope (`{ success, statusCode, message, meta?, data }`) and the error envelope (`{ success: false, message, errorMessage?, errorDetails?, stack? }`) as distinct shapes, reading the status code from the HTTP response rather than the error body.

#### Scenario: Successful paginated response
- **WHEN** the API responds `200` with `meta` and `data`
- **THEN** `apiFetch` resolves to `{ data, meta, message }`

#### Scenario: Error response
- **WHEN** the API responds with a non-OK status, or with `success: false`
- **THEN** `apiFetch` throws an `ApiError` carrying the HTTP status and the parsed error body

#### Scenario: Unparseable response body
- **WHEN** the response body is not valid JSON
- **THEN** `apiFetch` throws an `ApiError` with a synthesized `{ success: false, message: 'Network error' }` body rather than crashing

### Requirement: Structured error accessors
`ApiError` SHALL expose accessors that map the backend's error contract onto UI decisions: `fieldErrors`, `isUnauthorized`, `isNotFound`, `needsManualMetadata`, and `canonicalUrl`.

#### Scenario: Zod validation failure mapped to form fields
- **WHEN** the API responds `400` with `errorDetails.issues = [{ path: "Confidence", message: "Confidence Must Be Between 1 And 5" }]`
- **THEN** `error.fieldErrors` equals `{ confidence: "Confidence Must Be Between 1 And 5" }`, lowercasing only the first character of `path`

#### Scenario: Metadata resolution failure
- **WHEN** the API responds `422` with `errorDetails.canonicalUrl`
- **THEN** `error.needsManualMetadata` is `true` and `error.canonicalUrl` returns the echoed URL

#### Scenario: Top-level message not used for field errors
- **WHEN** a form renders errors from a `400`
- **THEN** it renders per-field messages from `fieldErrors` and MUST NOT render the machine-concatenated top-level `message` as a field label

### Requirement: Query parameter serialization
The client SHALL drop `undefined`, `null`, and empty-string query values, and SHALL serialize list-style filters as comma-separated strings and boolean-style filters as the literal strings `"true"` / `"false"` where the backend requires them.

#### Scenario: Empty filters omitted
- **WHEN** `apiFetch('/api/problems', { query: { page: 1, search: '', topic: undefined } })` is called
- **THEN** the outbound URL contains `page=1` only

#### Scenario: Multi-value filter
- **WHEN** the caller passes difficulties `['MEDIUM', 'HARD']`
- **THEN** the outbound URL contains `difficulty=MEDIUM,HARD` and not repeated `difficulty` parameters

#### Scenario: Boolean-as-string filter
- **WHEN** the caller filters on `solutionViewed: false`
- **THEN** the outbound URL contains `solutionViewed=false` as a string literal

### Requirement: Shared domain types
`lib/api/types.ts` SHALL declare types mirroring every backend enum and presenter shape, including the `LocalDate` and `Instant` distinction, and every read/write helper SHALL be typed against them.

#### Scenario: Local date versus instant
- **WHEN** a type describes `nextDueDate` and `nextDueAt`
- **THEN** the former is typed `LocalDate | null` and the latter `Instant | null`, so the two cannot be silently interchanged

#### Scenario: Nullable aggregates
- **WHEN** a type describes `revisionCompletion.rate` or any `average*` field
- **THEN** it is typed as `number | null`

### Requirement: Per-request deduplication
Resource readers SHALL be wrapped in React's `cache()` so that two components rendering in the same request pass hit the API once.

#### Scenario: Two components need the same problem
- **WHEN** a page and its header both call `getProblem(id)` during one render
- **THEN** exactly one HTTP request is made to `/api/problems/:id`

### Requirement: No-store default and path revalidation
All reads SHALL default to `cache: 'no-store'`, and every mutation SHALL call `revalidatePath` for each view its result can change.

#### Scenario: Default read caching
- **WHEN** a reader does not explicitly pass a cache mode
- **THEN** the fetch is issued with `cache: 'no-store'`

#### Scenario: Attempt mutation revalidation
- **WHEN** an attempt is created, updated, or deleted
- **THEN** `/problems`, `/problems/[id]`, `/dashboard`, and `/insights` are all revalidated

#### Scenario: Timezone change revalidation
- **WHEN** the owner's timezone is changed
- **THEN** `revalidatePath('/', 'layout')` is called because every derived date in the product moves

### Requirement: Local date rendering utility
The system SHALL provide date helpers that render `LocalDate` strings without passing them through `new Date()` with browser-locale formatting, and that render instants against the owner's timezone as returned by the API.

#### Scenario: LocalDate rendered west of UTC
- **WHEN** the owner's browser is in `America/Los_Angeles` and a `LocalDate` of `"2026-08-08"` is rendered
- **THEN** the displayed day is 8 August, not 7 August

#### Scenario: Instant rendered in owner timezone
- **WHEN** an instant is displayed and the API reported `timezone: "Asia/Dhaka"`
- **THEN** it is formatted in `Asia/Dhaka`, not in `Intl.DateTimeFormat().resolvedOptions().timeZone`

#### Scenario: Days-until-due is never computed client-side
- **WHEN** a due item shows how overdue it is
- **THEN** it renders the backend's `daysOverdue`, or compares `LocalDate` strings lexicographically, and never subtracts instants
