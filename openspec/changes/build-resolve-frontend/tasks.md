## 1. Project setup and dependencies

- [x] 1.1 Read `node_modules/next/dist/docs/01-app/` for the routing, data-fetching, caching, and proxy conventions of this Next.js version before writing any route code (per `AGENTS.md`)
- [x] 1.2 Install runtime dependencies with pnpm: `next-themes`, `date-fns`, `date-fns-tz`, `zod`, `sonner`, `server-only`
- [x] 1.3 Add the `@bklit` registry to `components.json` and verify it resolves via `pnpm dlx shadcn@latest info --json`
- [x] 1.4 Install the shadcn primitives the app needs: card, badge, input, textarea, label, select, dialog, alert-dialog, dropdown-menu, popover, calendar, tabs, table, skeleton, separator, sheet, tooltip, sonner, switch, checkbox, form
- [x] 1.5 Create `.env.example` documenting `API_BASE_URL` (server-only) and a README note that the backend's `APP_URL` must equal the Next.js origin
- [x] 1.6 Replace the placeholder metadata in `app/layout.tsx` with real ReSolve metadata and wire `next/font`

## 2. API client foundation

- [x] 2.1 Write `lib/api/types.ts` with every primitive, enum, envelope, and presenter type from the integration guide, keeping `LocalDate` and `Instant` as distinct types
- [x] 2.2 Write `lib/api/http.ts`: `server-only`, `BASE_URL` fail-fast, `apiFetch` with query serialization that drops empty values, `cache: 'no-store'` default, and the raw-JWT `Authorization` header with no `Bearer ` prefix
- [x] 2.3 Implement the `ApiError` class with `fieldErrors`, `isUnauthorized`, `isNotFound`, `needsManualMetadata`, and `canonicalUrl` accessors, mapping `errorDetails.issues[]` to lowercase-initial field names
- [x] 2.4 Write `lib/api/tags.ts` with the cache-tag constants
- [x] 2.5 Write `cache()`-wrapped readers per resource: `lib/api/{user,problems,attempts,revisions,topics,dashboard,insights,settings,reminders}.ts`
- [x] 2.6 Write `lib/date.ts`: `formatLocalDate`, `formatInstant(value, timezone)`, `compareLocalDate`, `todayInZone`, and a `relativeDueLabel` helper that consumes the server's `daysOverdue` rather than computing it
- [x] 2.7 Write `lib/validation.ts` with Zod schemas mirroring the backend constraints (attempt duration 1–1440, confidence 1–5, notes ≤2000, title ≤300, topic ≤60, sourceName ≤200, statement ≤20000, absolute http(s) `sourceUrl`, no future `attemptedAt`)
- [x] 2.8 Verify `apiFetch` cannot be imported from a Client Component by adding a temporary client import and confirming the build fails, then remove it

## 3. Session and routing guard

- [x] 3.1 Create `proxy.ts` at the project root exporting `proxy` and `proxyConfig` with a matcher excluding `_next/static`, `_next/image`, `favicon.ico`, and `/login`
- [x] 3.2 Implement JWT `exp` decoding that returns `0` on any parse failure, and the 5-minute proactive refresh skew
- [x] 3.3 Implement the refresh call sending `Cookie: refreshToken=<token>`, writing both rotated tokens to the response cookies and rewriting the request cookies so the current render sees the new access token
- [x] 3.4 Implement the failure path: clear both cookies and redirect to `/login` on a rejected refresh or a missing refresh token
- [x] 3.5 Build `app/(auth)/login/page.tsx`, `login-form.tsx` (`useActionState`, pending state, `role="alert"` message), and `actions.ts` writing `resolve_access` / `resolve_refresh` with the correct cookie attributes
- [x] 3.6 Map login `401` and `404` to the identical "Invalid email or password." message, and surface `400` issues as field errors
- [x] 3.7 Implement the logout Server Action: best-effort API call, unconditional cookie deletion, redirect to `/login`
- [x] 3.8 Replace `app/page.tsx` with a redirect to `/dashboard`

## 4. Theming

- [x] 4.1 Add `ThemeProvider` (`attribute="class"`, `defaultTheme="dark"`, `enableSystem`, `disableTransitionOnChange`) to the root layout and set `suppressHydrationWarning` on `<html>`
- [x] 4.2 Extend `app/globals.css` with the full light and dark token sets, including `--chart-1` … `--chart-5` for both palettes
- [x] 4.3 Define semantic token pairs for practice states (`SCHEDULED`, `DUE`, `OVERDUE`, `MASTERED`, `NEEDS_REINFORCEMENT`) and difficulties (`EASY`, `MEDIUM`, `HARD`, `UNRATED`), verified for WCAG AA contrast in both palettes
- [x] 4.4 Build the theme toggler (light / dark / system) with an accessible name and active-theme indication, and mount it in the shell header
- [x] 4.5 Verify no flash on hard reload in both themes, and that no hydration warning is logged

## 5. Motion system

- [x] 5.1 Add motion tokens to `app/globals.css`: fast/base/slow/reveal durations, easing curves including `cubic-bezier(0.85, 0, 0.15, 1)`, and stagger step
- [x] 5.2 Add the global `@media (prefers-reduced-motion: reduce)` block neutralizing durations, delays, and transforms
- [x] 5.3 Build `FadeInUp` / `Stagger` CSS-driven entrance primitives with a stagger cap so late items are not visibly delayed
- [x] 5.4 Build `AnimatedNumber` as a client leaf: Web Animations API count-up, animates from the previous value on change, tabular figures, final value announced once to assistive tech, instant under reduced motion
- [x] 5.5 Build `ProgressRing` for the streak and completion-rate meters, with an explicit empty state for `null`
- [x] 5.6 Build the skeleton→content crossfade wrapper, ensuring skeletons occupy the same footprint as their resolved content
- [x] 5.7 Add View Transitions for route navigation with graceful degradation where unsupported
- [x] 5.8 Document in `lib/motion.ts` that animations are restricted to `transform` and `opacity`, and that animated components must be leaves under Server Component parents

## 6. Application shell

- [x] 6.1 Build `app/(app)/layout.tsx` with the navigation shell, owner menu slot, reminder banner slot, and toast region
- [x] 6.2 Build primary navigation for Dashboard, Library, Topics, Insights, Settings with `aria-current="page"` on the active item
- [x] 6.3 Build the mobile navigation drawer with focus trapping and focus restoration on close
- [x] 6.4 Build the owner menu from `GET /api/users/me` with initials fallback, and a neutral placeholder when the request fails with a non-401 error
- [x] 6.5 Add the global "Add problem" capture entry point reachable from every authenticated route
- [x] 6.6 Add `error.tsx` and `not-found.tsx` at the app root, plus `loading.tsx` for each data-backed segment
- [x] 6.7 Verify every route is usable at 360px width with no horizontal page scroll, and that wide content scrolls within its own container

## 7. Today dashboard

- [x] 7.1 Build `app/(app)/dashboard/page.tsx` rendering the heading and layout immediately with data sections inside Suspense
- [x] 7.2 Fetch the dashboard and reminder state in parallel with `Promise.all`
- [x] 7.3 Build the due/overdue counter cards using `AnimatedNumber`, with overdue visually emphasized
- [x] 7.4 Build the caught-up empty state for when both counts are zero
- [x] 7.5 Build the streak card with `ProgressRing` and a zero-streak empty state
- [x] 7.6 Build the recommended queue showing at most five items and stating the full due total, with a control to reveal the rest — never rendering recommended and due as disjoint sets
- [x] 7.7 Build `DueProblemCard` showing title, source, difficulty, topics, stage, due date, server-provided `daysOverdue`, and the `solutionViewed` indicator, preserving server order
- [x] 7.8 Add inline attempt logging from a due card, revalidating the dashboard on success and animating the item out when it leaves the due list
- [x] 7.9 Build the 7-day lookahead chart from `@bklit`, plotting zero-count days and labelling `LocalDate` values without browser-locale parsing
- [x] 7.10 Build the freshness refresher: minutes-scale interval plus `visibilitychange` refresh, with cleanup on unmount
- [x] 7.11 Surface the owner's operative timezone with a link to settings
- [x] 7.12 Build `dashboard/loading.tsx` with skeletons matching the resolved layout's footprint

## 8. Problem library

- [x] 8.1 Build `app/(app)/problems/page.tsx` reading every filter, sort, and page value from awaited `searchParams` and rendering server-side
- [x] 8.2 Build the filter provider owning URL synchronization, with controls consuming it rather than writing the URL themselves
- [x] 8.3 Implement status, difficulty, topic, source, and solution-viewed filters, sending comma-separated lists and string-literal booleans
- [x] 8.4 Populate topic filter chips from `GET /api/topics`, filtering by `slug` and displaying `name` with counts
- [x] 8.5 Implement debounced title search with a pending indicator, hinting that it matches titles only
- [x] 8.6 Implement sorting over `createdAt`, `title`, `difficulty`, and `nextDueAt`, explaining the enum-order difficulty sort and nulls-last due sort
- [x] 8.7 Implement pagination from `meta`, preserving other filters, resetting to page 1 on any filter or sort change, and showing the total
- [x] 8.8 Wrap all `useSearchParams` consumers in `<Suspense>` and confirm the route is not forced to CSR
- [x] 8.9 Build `LibraryProblemRow` rendering the server's `practiceState` verbatim, a distinct "not started" treatment for `null`, and `sourceName` attribution for custom problems
- [x] 8.10 Build the three distinct states: empty library onboarding, no-matches-with-active-filters, and invalid-URL-parameters with a reset control
- [x] 8.11 Add the fade-out/fade-in transition and pending state when the result set changes
- [x] 8.12 Note in the status filter UI that never-attempted problems are excluded when any status filter is active

## 9. Problem capture

- [x] 9.1 Build `app/(app)/problems/new/page.tsx` with LeetCode and custom modes as explicit variants, not a boolean flag
- [x] 9.2 Implement the `previewProblem` Server Action returning a discriminated union of `resolved` / `exists` / `manual` / `invalid`
- [x] 9.3 Build the preview confirmation step showing resolved title, difficulty, and topics as editable before capture
- [x] 9.4 Handle `existingProblemId`: state the problem is already in the library and make opening it the primary action
- [x] 9.5 Handle `400`: render an inline field error on the URL input and create nothing
- [x] 9.6 Handle `422`: switch to manual mode pre-filled from `errorDetails.canonicalUrl`, requiring title and difficulty together and excluding `UNRATED`
- [x] 9.7 Build the custom-problem form with title, difficulty (defaulting to `UNRATED`), topics, source name, source URL, and statement, validated against `lib/validation.ts`
- [x] 9.8 Build the topic input with suggestions from `GET /api/topics` and a note that case and spacing normalize to an existing topic
- [x] 9.9 Implement the `captureProblem` Server Action branching on `alreadyExisted`: route to the existing problem without a "created" toast on `200`, and to the new problem with a creation toast on `201`
- [x] 9.10 Revalidate `/problems`, `/topics`, and `/insights` after a successful capture
- [x] 9.11 Ensure the post-capture view shows the not-started state and prompts for the first attempt

## 10. Problem detail

- [x] 10.1 Build `app/(app)/problems/[id]/page.tsx` awaiting `params` and rendering from the single detail request, with `notFound()` called outside `try`/`catch` on `404` and `400`
- [x] 10.2 Build the header: title, source, difficulty, topics, practice state, current stage, next due date, and `solutionViewed` indicator
- [x] 10.3 Build the external-link block for `canonicalUrl` and `sourceUrl` with `rel="noopener noreferrer"`
- [x] 10.4 Build the five-stage timeline from the server's `timeline`, with sequential reveal animation and the current stage distinguished
- [x] 10.5 Build the no-cycle empty state driven by `cycleStartsOnFirstAttempt`
- [x] 10.6 Build the attempt history list, newest-first, with outcome copy, duration, confidence, notes, and dates in the owner's timezone
- [x] 10.7 Build the revision event feed with per-type human copy, reschedule reasons, instants formatted in the owner's timezone, and keys derived from `type + createdAt` rather than `id`
- [x] 10.8 Build the metadata edit form: full topic-set replacement with an explicit warning, read-only canonical URL, no `UNRATED` for LeetCode, explicit `null` for cleared optional fields, and blocked empty submissions
- [x] 10.9 Build the delete flow behind a confirmation naming the problem and everything cascaded, revalidating `/problems`, `/dashboard`, `/insights`, `/topics` and redirecting to the library
- [x] 10.10 Build `[id]/error.tsx` and `[id]/loading.tsx`

## 11. Attempt logging

- [x] 11.1 Build the log-attempt form with outcome, duration, confidence, and notes, sending numbers as JSON numbers and empty notes as `null`
- [x] 11.2 Add per-outcome descriptions of the schedule effect, and an explicit warning that `VIEWED_SOLUTION` resets the cycle and permanently marks the problem
- [x] 11.3 Implement client-side validation against `lib/validation.ts`, with server `errorDetails.issues[]` still mapped onto fields
- [x] 11.4 Implement backdating: omit `attemptedAt` by default, send an ISO instant when set, block future values client-side, and explain that the schedule is replayed from the full history
- [x] 11.5 Implement the `logAttempt` Server Action bound with `problemId`, returning the response's `currentStage`, `nextDueDate`, `practiceState`, and `solutionViewed`
- [x] 11.6 Surface the schedule delta in the confirmation, with a distinct mastery message when `nextDueDate` is null
- [x] 11.7 Build the edit-attempt form targeting `PATCH /api/attempts/:id`, blocking empty patches and surfacing the possibly-moved schedule in the confirmation without assuming `solutionViewed` was returned
- [x] 11.8 Build the delete-attempt flow with confirmation, and render the no-cycle empty state when the response returns `currentStage: null`
- [x] 11.9 Revalidate `/problems/[id]`, `/problems`, `/dashboard`, and `/insights` after every attempt mutation
- [x] 11.10 Make attempt logging reachable from both the detail page and the dashboard due cards

## 12. Revision rescheduling

- [x] 12.1 Build the reschedule form with a date input whose `min` is the owner's local today from the API, sending the `yyyy-MM-dd` value verbatim
- [x] 12.2 Make the reason field required and reject whitespace-only input client-side
- [x] 12.3 Hide the reschedule control when there is no revision cycle or the practice state is `MASTERED`
- [x] 12.4 Implement the `reschedule` Server Action, replacing the rendered timeline, stage, anchor date, and practice state from the response
- [x] 12.5 Surface each backend `400` message against the form, and revalidate `/problems/[id]`, `/problems`, `/dashboard`, `/insights`

## 13. Topics

- [x] 13.1 Build `app/(app)/topics/page.tsx` rendering the vocabulary in server order with problem counts, and an explicit unused treatment for count 0
- [x] 13.2 Add the used-only filter sending the literal string `usedOnly=true`
- [x] 13.3 Link each topic to `/problems?topic=<slug>`
- [x] 13.4 Build the rename form with client-side validation for empty, whitespace-only, over-length, and non-slugifiable names
- [x] 13.5 Implement the collision warning: detect when the entered name normalizes to an existing topic's slug and require confirmation of the merge
- [x] 13.6 Detect a merge after the fact by comparing the returned `id` to the sent `id`, and report the surviving topic
- [x] 13.7 Revalidate `/topics`, `/problems`, and `/insights` after a rename, and ensure a stale topic slug in a library URL renders an empty result with a clear-filter option
- [x] 13.8 Build the empty-vocabulary state explaining that topics are created by tagging problems

## 14. Insights

- [x] 14.1 Build `app/(app)/insights/page.tsx` with four independent Suspense boundaries so all four requests start in parallel and each card streams on its own
- [x] 14.2 Build the range picker writing `from`/`to` to `searchParams`, preventing inverted ranges and spans over 365 days
- [x] 14.3 Build the summary card with animated numerals, labelling `mastered` as a current total rather than a ranged figure
- [x] 14.4 Render `revisionCompletion` with its numerator and denominator, and an em dash — never `0%` — when `rate` is `null`
- [x] 14.5 Render both average solve-time buckets with sample counts, using an em dash for `null` averages
- [x] 14.6 Build the activity heatmap rendering the API's zero-count days as-is, with focusable, screen-reader-accessible cells and no client-side gap filling
- [x] 14.7 Build the backlog card distinguishing the current `overdueCount` from the end-of-day `trend`, conveying direction with a label or icon rather than color alone
- [x] 14.8 Build the weak-topics card ranked worst-first, stating the thresholds, rendering `independentSolveRate` as an already-percentage value, marking under-sampled topics, and using em dashes for `null` aggregates
- [x] 14.9 State on the weak-topics card that topic insights are always all-time, and send no range parameters to that endpoint
- [x] 14.10 Wire chart reveal replay on range change via `revealSignature` or a new key, using only `chartCssVars` / `--chart-*` colors
- [x] 14.11 Give each card its own error boundary so one failing endpoint does not take down the page
- [x] 14.12 Build the positive empty state for when `weakTopics` is empty

## 15. Settings and profile

- [x] 15.1 Build `app/(app)/settings/page.tsx` rendering from `GET /api/settings`, including the lazily created defaults on first read
- [x] 15.2 Build the timezone picker from `Intl.supportedValuesOf('timeZone')`, selecting the stored value and offering the browser zone only as a suggestion
- [x] 15.3 Build the reminder-time control producing zero-padded `HH:mm` and rejecting invalid hours
- [x] 15.4 Build the notification toggle sending a JSON boolean, with copy explaining that reminders only appear while the app is open
- [x] 15.5 Display `lastAcknowledgedDate` as read-only and never send it
- [x] 15.6 Implement the `updateSettings` action sending only changed fields, never an empty body, and calling `revalidatePath('/', 'layout')` after a timezone change with an explanation to the owner
- [x] 15.7 Build the profile form using `PUT /api/users/my-profile`, omitting blank optional fields and validating name, email, photo URL, and bio lengths
- [x] 15.8 Handle the profile `404` (missing profile row) with a specific actionable message rather than a generic not-found page, and map `400` duplicate-email to the email field
- [x] 15.9 Revalidate the layout after a profile update so the shell's name and avatar refresh

## 16. Reminders

- [x] 16.1 Build the server-rendered `ReminderBanner` shown only when `active && !acknowledged`, using the API's `notification.title` and `body` verbatim
- [x] 16.2 Map the API's `targetPath` onto this app's dashboard route
- [x] 16.3 Expose the banner as a polite live region and render the `dueTomorrow` / `dueToday` / `overdueToday` counts as returned
- [x] 16.4 Build the acknowledge action with a pending state, revalidating the layout on success and handling a no-op acknowledgement without surfacing an error
- [x] 16.5 Build the reminder refresher: minutes-scale interval plus `visibilitychange`, with interval and listener cleanup on unmount
- [x] 16.6 Build the opt-in browser notification requesting permission from a user gesture, using the API's copy, navigating to the mapped target, suppressing repeats within a local date, and degrading silently when denied or unsupported

## 17. Verification

- [x] 17.1 Walk the entire §10 gotchas checklist from `docs/API_INTEGRATION.md` against the implementation and fix every deviation
- [x] 17.2 Grep the codebase for `Bearer `, `NEXT_PUBLIC_API`, and `new Date(` applied to `LocalDate` values, and confirm there are no hits
- [x] 17.3 Verify no token, cookie value, or `API_BASE_URL` appears in any client bundle
- [x] 17.4 Test the auth lifecycle end to end: login, protected navigation, proactive refresh near expiry, rejected refresh redirecting to `/login`, and logout
- [x] 17.5 Test every mutation's revalidation by confirming the dashboard, library, detail, and insights views reflect the change without a manual reload
- [x] 17.6 Test the local-midnight boundary by changing the timezone in settings and confirming every derived date and badge updates
- [x] 17.7 Run a keyboard-only pass over every route, and an axe or Lighthouse accessibility audit, fixing contrast and focus issues in both themes
- [x] 17.8 Verify the full experience with `prefers-reduced-motion: reduce` enabled: no transforms, no count-up, no chart reveal, all final values visible
- [x] 17.9 Verify no theme flash and no hydration warnings on hard reload in both light and dark
- [x] 17.10 Run `pnpm lint` and `pnpm build` clean, and confirm no route unexpectedly bails out to client-side rendering

> **4.5, 6.7, and 17.4–17.9 are blocked on a running backend.** The ReSolve API
> is not listening on `localhost:6000`, so every authenticated route 307s to
> `/login` and none of these checks can see real data or a real viewport.
>
> What was verified without it: the proxy redirects `/` and `/dashboard` to
> `/login` when no session cookie is present, `/login` renders, and the
> `next-themes` blocking script is emitted as the first node in `<body>` —
> before any painted content, which is the mechanism that prevents the flash.
>
> Run these eight once the API is up and the owner account is seeded.
