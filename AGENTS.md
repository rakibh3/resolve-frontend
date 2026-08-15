<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Commands

```bash
pnpm install
pnpm dev            # dev server on :3000 — the API's CORS allowlist is exactly this origin
pnpm build
pnpm start
pnpm lint           # eslint (flat config; components/charts/** is ignored as vendored)
```

There is no test runner. `playwright` and `@axe-core/playwright` are installed for ad-hoc
accessibility checks only — no suite, no script, no spec files.

Before running anything you need `.env.local` with `API_BASE_URL` (the ReSolve API origin
**without** the `/api` prefix — request paths carry it). `lib/api/http.ts` throws at import time if
it is missing. The API must be seeded with the owner account (`bun run seed` on the backend);
ReSolve is single-user and has no registration endpoint.

The API **must not listen on port 6000**. It is X11 on the WHATWG blocked-port list, so Node's
`fetch` — which is what `lib/api/http.ts` and `proxy.ts` both use — rejects it with `bad port`
before opening a connection, and every page fails identically with no request ever reaching the
API. The backend's own `.env` still ships `PORT=6000`; start it with `PORT=6001` (or any unblocked
port) and point `API_BASE_URL` at the same one.

## Architecture

**Every read is a Server Component; every write is a Server Action. There is no client-side data
layer, and the browser never talks to the API.** This is forced by the backend, not a preference:
the API issues cookies as `SameSite=None; Secure=false` (browsers reject them) and its CORS
allowlist is a single origin. `API_BASE_URL` must never gain a `NEXT_PUBLIC_` prefix.

The session lives in first-party `httpOnly` cookies (`resolve_access`, `resolve_refresh`) written by
`lib/session.ts`. `lib/api/http.ts` is `server-only` and attaches the access token to every outbound
request.

### The three files that carry the load

- `proxy.ts` — session guard and the **only** token-refresh site in the app. The API rotates refresh
  tokens (a successful refresh deletes the old row), so concurrent refreshes race and the loser's
  token is already dead. Refresh is proactive on a 5-minute skew against the JWT `exp`, and it
  rewrites the *request* cookies so the current render already sees the new token. Next 16.3 reads
  the matcher from an export named `config`, not `proxyConfig` — the integration guide is wrong here.
- `lib/api/http.ts` — `apiFetch`, the `ApiError` class, and query serialization. `apiFetch`
  deliberately does **not** retry on 401 (Server Components cannot set cookies). Reads default to
  `cache: "no-store"`.
- `lib/api/*.ts` — one module per resource, each reader wrapped in React `cache()` so parallel
  Suspense boundaries in the same render share a single request. The one exception is
  `lib/api/search.ts`: a search is a function of a string the owner is still typing, so there is
  nothing to deduplicate and a shared response could outlive its query.

### Routing

`app/(app)/` is the authenticated shell (dashboard, problems, recall, insights, settings, plus the
`topics` and `patterns` vocabulary pages and `search`); `app/(auth)/login/` is the only public
route. Route-local components live in `_components/` and route-local Server Actions in `actions.ts`
next to the page that uses them.

`lib/nav.ts` holds two lists. `NAV_ITEMS` is the top bar and is capped at five; `SECONDARY_NAV_ITEMS`
(topics, patterns) appears in the mobile drawer and the account menu, because those are tidy-up
pages rather than daily destinations. Search is a header icon, not a nav slot.

Pages open independent `<Suspense>` boundaries per card/section so requests start in parallel and
each region paints as its own data lands (see `app/(app)/insights/page.tsx`). Animated pieces are
the smallest possible **client leaves** — the Server Component that fetched the data stays a Server
Component.

### Cache invalidation

Nothing uses tagged caching today; freshness comes from `revalidatePath` after every mutation, using
the path constants in `lib/api/tags.ts`. Tags can't express the thing that most often makes ReSolve
data stale — local midnight passing, which silently turns every `DUE` badge into `OVERDUE`. A timezone
change needs `revalidatePath("/", "layout")`.

## API contract rules that bite

`docs/API_INTEGRATION.md` is authoritative (§10 is the full gotchas checklist). The ones that cause
silent breakage:

- The `Authorization` header carries the **raw JWT with no `Bearer ` prefix**.
- Error bodies have no `statusCode`; field errors are in `errorDetails.issues[]` with Title-Cased
  paths. `ApiError.fieldErrors` lowercases only the first character (`"SourceUrl"` → `"sourceUrl"`).
- Every `PATCH` rejects an empty body — check before sending. `PATCH /api/problems/:id` with
  `topics` **replaces** the whole set. Profile updates use `PUT`, not `PATCH`.
- Query arrays are comma-separated strings, not repeated keys; booleans are the string literals
  `"true"`/`"false"`. `durationMinutes` and `confidence` must be JSON numbers.
- `POST /api/problems` returns **200 with `alreadyExisted: true`** for a duplicate URL — success, not
  an error. A **422** from capture/preview means "let the owner type the metadata", with
  `errorDetails.canonicalUrl` to pre-fill.
- Login `401` and `404` both mean "bad credentials" — one identical message.
- `revisionCompletion.rate`, `recallCoverage.rate`, and every `average*` field can be `null` — render
  "—", never `0`.
- `dashboard.recommended` is a slice of `due`, not a disjoint set.
- The stage ladder is **six** rungs: `DAY_0 → DAY_1 → DAY_3 → DAY_7 → DAY_15 → DAY_30`. Nothing may
  hard-code five. (Reinforcement after a low-confidence `DAY_30` restarts at `DAY_7` and skips
  `DAY_3`.)

## The recall layer

Cards are knowledge; attempts are history. The distinction drives rules that are otherwise
surprising:

- **A card never affects scheduling.** Writing, editing, or deleting one leaves `currentStage`,
  `nextDueDate`, and `practiceState` untouched and emits no revision event, so card mutations must
  **not** revalidate `/dashboard`. `RECALL_MUTATION_PATHS` in `lib/api/tags.ts` is that list, minus
  the dashboard, on purpose.
- **`PUT /api/problems/:id/recall` is a full replace.** An omitted field is stored as empty and an
  omitted `patterns` list wipes the problem's patterns — which is why `recallCardSchema` has no
  partial variant and the editor always submits every field. It answers **201 on create, 200 on
  replace**; `ApiResult.statusCode` exists so that can be branched on.
- **Topics ≠ patterns.** A topic says what a problem is *about* and comes from LeetCode; a pattern
  says *how the owner solves it* and can only be assigned through a card. `POST`/`PATCH
  /api/problems` silently strip `patterns`. Card writes take display **names**; `?pattern=` filters
  take **slugs**.
- **`needsRecallUpdate` is derived per read**, like `practiceState`: true when a `VIEWED_SOLUTION`
  attempt is newer than the card. This is why attempt mutations revalidate `/recall` even though
  they never touch a card.
- The recall sheet's untagged group has **`slug: null`** and no page to link to, the same problem
  appears under every pattern it carries, and `totalCards` counts distinct cards — never sum the
  groups.
- `DELETE .../recall` also unlinks every pattern. The confirm dialog counts them.

`GET /api/search` matches note and card text; `GET /api/problems?search=` matches titles only. `q`
must be ≥ 2 chars (`isSearchable`), `scope` is a single value, ordering is field priority rather
than relevance, and `meta.truncated` means `meta.total` is the capped count.

## Dates

Two shapes, never interchangeable, both handled by `lib/date.ts`: `LocalDate` (`yyyy-MM-dd`, fields
ending in `Date`) is a calendar day in the **owner's** timezone and must be formatted lexically —
`new Date("2026-08-08")` parses as UTC midnight and renders as the previous day west of UTC.
`Instant` (ISO UTC, fields ending in `At`) is formatted against the timezone the API reported, never
the browser's. `<input type="date">` already produces `yyyy-MM-dd`; send it verbatim.

## UI

shadcn in the `base-nova` style on Base UI (`@base-ui/react`) — not Radix. Charts come from the
`@bklit` registry, vendored into `components/charts/` (66 files) so they can be themed and upgraded
deliberately; that directory is ESLint-ignored as upstream code, and chart *usage* belongs in
`app/**/_components`. Shared non-route components: `components/domain/` (badges, chips),
`components/motion/`, `components/ui/`.

Semantic tokens in `app/globals.css` cover practice states (`--state-due`, `--state-overdue`, …) and
difficulties (`--difficulty-easy`, …) in both palettes at WCAG AA — use those, not raw colors.
`components/domain/` holds the shared vocabulary pieces: `TopicChips` and `PatternChips` are
deliberately styled apart (patterns carry the accent fill and a `#`) because a mixed row of plain
outline badges reads as one vocabulary when it is two, and `VocabularyInput` / `UsedOnlyToggle` are
shared by both.
Motion rules are documented at the top of `lib/motion.ts`: transform/opacity only, and
`prefers-reduced-motion` is a hard cutoff to the final value, not a softening.

`lib/validation.ts` mirrors the backend's Zod constraints to avoid round trips, but the server's
`errorDetails.issues[]` always wins. When backend constraints change, update `LIMITS` there.
`slugifyName` mirrors the backend's normalization for both vocabularies, which is what lets the
rename dialogs warn about a merge before it happens.

## Specs

`openspec/changes/build-resolve-frontend/` holds the proposal, per-capability specs, design
decisions, and the task breakdown this implementation was built from. The `opsx` skills/commands
(`.claude/commands/opsx/`) drive that workflow.

