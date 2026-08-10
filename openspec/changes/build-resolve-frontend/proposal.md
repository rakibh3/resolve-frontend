## Why

The ReSolve backend is complete and fully documented (`docs/API_INTEGRATION.md`, `postman-collection.json`), but the frontend is still an untouched `create-next-app` scaffold — there is no way for the owner to actually use the spaced-repetition engine. This change builds the entire Next.js 16 App Router client against that contract: a single-user, server-rendered application where the browser never holds an API token, and where the daily "what do I revise today" question is answered in one glance.

## What Changes

- **Session layer.** Login screen backed by a Server Action that exchanges credentials for tokens and stores them in Next.js's own first-party httpOnly cookies (`resolve_access` / `resolve_refresh`). A root `proxy.ts` guards every non-public route and performs proactive, single-flight token rotation before render. Logout invalidates the refresh token server-side and clears cookies.
- **Typed API client.** A `server-only` `apiFetch` wrapper implementing the exact envelope contract: raw JWT `Authorization` header (**no `Bearer ` prefix**), success/error envelope discrimination, an `ApiError` class exposing `fieldErrors` from `errorDetails.issues[]`, `needsManualMetadata` (422) and `canonicalUrl` accessors, plus `cache()`-deduped readers per resource. Full `lib/api/types.ts` mirroring every backend enum and presenter shape.
- **Application shell.** Persistent sidebar/topbar navigation, owner avatar, reminder banner slot, command-style capture entry point, and route-level `loading.tsx` / `error.tsx` / `not-found.tsx` boundaries.
- **Theming.** `next-themes` integration with **dark mode as the default**, a header theme toggler (light / dark / system), `suppressHydrationWarning` on `<html>`, and a no-flash inline script. Both palettes are first-class — the existing shadcn `base-nova` tokens in `app/globals.css` are extended, not replaced.
- **Motion system.** A shared set of animation primitives and tokens (staggered card entrances, count-up numerals, animated ring/streak meters, chart reveal, view transitions between routes, skeleton→content crossfade) built on the Bklit chart animation conventions and CSS/Web Animations where possible, all gated behind `prefers-reduced-motion`.
- **Today dashboard.** `GET /api/dashboard/today` rendered as an animated, Suspense-streamed page: due/overdue counters, streak meter, the recommended-five queue, the full due list, and a 7-day lookahead chart.
- **Problem library.** URL-driven filtering (`status`, `difficulty`, `topic`, `source`, `solutionViewed`, `search`), sorting, and pagination — all filter state lives in `searchParams` so the view stays shareable and server-rendered.
- **Problem capture.** Two-step LeetCode flow (preview → confirm → capture) with automatic fallback to manual metadata entry on a 422, plus a custom-problem form. Duplicate captures (`alreadyExisted: true`, HTTP 200) route to the existing problem rather than showing a false "created" toast.
- **Problem detail.** Metadata, the projected 5-stage revision timeline, attempt history, the revision event feed, inline metadata editing, and destructive delete behind confirmation.
- **Attempt logging.** The product's most important write: log / backdate / edit / delete attempts, with the returned `currentStage` + `nextDueDate` surfaced in the confirmation because a replay can silently move the schedule.
- **Revision rescheduling.** Date-picker reschedule with a mandatory reason, `min` bound to the owner's local today, hidden when there is no cycle or the problem is mastered.
- **Topics.** Vocabulary listing with counts, plus rename — including an explicit merge warning when the normalized name collides with an existing topic.
- **Insights.** Four independently streamed cards: KPI summary with range picker, activity heatmap, backlog trend, and weak-topic ranking, with correct `null`-vs-`0` rendering throughout.
- **Settings & profile.** Timezone (IANA), notification toggle, reminder time, and owner profile editing — with a full `revalidatePath('/', 'layout')` after a timezone change since it re-derives every date in the product.
- **Reminders.** Server-rendered banner shown when `active && !acknowledged`, acknowledge action, an opt-in browser Notification using the API's own copy, and a minutes-scale (never seconds) refresh interval.
- **Date discipline.** A shared `LocalDate` utility module so `yyyy-MM-dd` values are never passed through `new Date()` + browser locale, and instants are always rendered against the owner's timezone from the API.

## Capabilities

### New Capabilities

- `api-client`: Server-only typed HTTP client, shared domain types, error mapping, request deduplication, and the cache/revalidation strategy.
- `session-auth`: Login, logout, cookie-based session storage, route protection, and proactive token rotation in `proxy.ts`.
- `app-shell`: Root layout, navigation, route boundaries, and the responsive/accessible application chrome.
- `theming`: Dark-by-default color scheme, theme toggler, no-flash hydration, and token structure for both palettes.
- `motion-system`: Reusable animation primitives, timing tokens, reduced-motion policy, and the dashboard's signature animated components.
- `today-dashboard`: The Today screen — counters, streak, recommended queue, due list, and 7-day lookahead.
- `problem-library`: Paginated, URL-driven filtering, sorting, and searching of the problem library.
- `problem-capture`: LeetCode preview/capture flow, manual-metadata fallback, custom-problem creation, and duplicate handling.
- `problem-detail`: Problem detail view, revision timeline, metadata editing, deletion, revision event feed, and rescheduling.
- `attempt-logging`: Creating, backdating, editing, and deleting attempts, and surfacing the resulting schedule delta.
- `topic-management`: Topic vocabulary listing and rename/merge with collision warnings.
- `insights-analytics`: Summary KPIs, activity heatmap, backlog trend, and weak-topic analysis with range selection.
- `owner-settings`: Timezone, notification, reminder-time, and owner profile management.
- `reminders`: Reminder state polling, in-app banner, acknowledgement, and browser notification.

### Modified Capabilities

_None — `openspec/specs/` is empty; this is the first change in the project._

## Impact

- **New dependencies:** `next-themes`, a date/timezone utility (`date-fns` + `date-fns-tz`), `sonner` for toasts, `zod` for client-side form pre-validation, and Bklit chart components installed from the `@bklit` shadcn registry (`components.json` gains the registry entry).
- **New shadcn components:** button (exists), card, badge, input, select, dialog, dropdown-menu, popover, calendar, tabs, table, skeleton, separator, sheet, tooltip, sonner, form primitives.
- **New root file:** `proxy.ts` (Next.js 16 naming — not `middleware.ts`).
- **Modified files:** `app/layout.tsx` (theme provider, fonts, metadata, `suppressHydrationWarning`), `app/globals.css` (theme tokens, motion tokens), `app/page.tsx` (replaced by a redirect to `/dashboard`), `next.config.ts`, `components.json`, `package.json`.
- **New environment variable:** `API_BASE_URL` — server-only, deliberately **not** `NEXT_PUBLIC_`. Requires the backend's `APP_URL` to match the Next.js origin or CORS rejects stray browser calls.
- **Backend:** no changes. The frontend consumes the existing contract exactly as documented; every constraint in `docs/API_INTEGRATION.md` §10 is treated as a hard requirement.
- **Out of scope:** registration/multi-user support (the API is single-owner by design), server-push notifications (no scheduler exists), and offline support.
