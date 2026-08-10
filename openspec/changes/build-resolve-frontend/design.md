## Context

The repository is an untouched `create-next-app` scaffold running **Next.js 16.3.0 / React 19.2.8 / Tailwind v4**, with shadcn configured for the `base-nova` style on Base UI (`@base-ui/react`), `lucide-react` icons, and pnpm as the package manager. Only `components/ui/button.tsx` and `lib/utils.ts` exist.

The backend (`docs/API_INTEGRATION.md`, `postman-collection.json`) is finished and single-user by design: no registration, no roles, no tenancy. Its integration contract has several sharp edges that shape the whole frontend architecture:

1. **The API's own cookies are unusable from a browser** (`SameSite=None; Secure=false`). Browser-to-API auth cannot work. Every API call must originate from the Next.js server.
2. **The `Authorization` header carries a raw JWT with no `Bearer ` prefix.**
3. **Refresh tokens rotate.** Two concurrent refreshes race and the loser's token row is already deleted, so refresh must happen in exactly one place, once per navigation.
4. **Everything is derived from "today" in the owner's timezone.** A cached list silently goes wrong at local midnight when `DUE` becomes `OVERDUE`.
5. **The revision engine is replay-based.** Any attempt write recomputes the whole schedule, so mutation responses — not assumptions — are the source of truth for the resulting stage and due date.
6. **Every authenticated request writes `lastActiveAt`**, so polling must be measured in minutes.

`AGENTS.md` additionally warns that this Next.js version has breaking changes relative to training data, and that the local docs at `node_modules/next/dist/docs/` are authoritative.

## Goals / Non-Goals

**Goals:**

- A complete, production-quality frontend covering every documented endpoint.
- A server-first architecture where the access token never reaches client JavaScript.
- Correct handling of every gotcha in `docs/API_INTEGRATION.md` §10 — these are treated as hard requirements, not advice.
- A dashboard that feels alive: staggered entrances, animated numerals, a filling streak meter, revealing charts — all of it reduced-motion-safe and none of it blocking data.
- Dark mode as the default, with a real theme toggler and both palettes fully designed.
- Composition-first component APIs (compound components, `children` over render props, no boolean-prop proliferation).

**Non-Goals:**

- Registration, multi-user, roles, or tenancy — the API has no such concepts.
- Server-initiated push notifications or closed-browser delivery — no scheduler exists.
- Offline support, optimistic-only mutation flows, or a client-side data-fetching library.
- Any client-side reimplementation of stage arithmetic, practice-state derivation, or due-date computation.

## Decisions

### D1 — Server Components read, Server Actions write; no client data layer

Every read is `await`ed directly in a Server Component. Every write is a Server Action invoked through `useActionState` or `useTransition`. There is no REST layer of our own, no route handlers for data, and no TanStack Query.

*Why:* the token must stay server-side, which rules out client fetching outright. Server Actions additionally give end-to-end type safety, progressive enhancement, and `revalidatePath` in the same function that performs the write.

*Alternative rejected:* proxying the API through our own `/api/*` route handlers so a client library could fetch. That doubles the surface area, re-introduces a client waterfall, and buys nothing for a single-user app.

### D2 — Auth lives in `proxy.ts`, and refresh happens there and nowhere else

Next.js 16 renames middleware to `proxy.ts` exporting `proxy` / `proxyConfig`. It runs once per navigation before rendering, which makes it the only place that can both (a) write cookies and (b) guarantee every Server Component below it sees a valid token.

Refresh is **proactive** (a 5-minute skew against the JWT `exp`), never reactive. `apiFetch` deliberately does *not* retry on 401: a Server Component cannot write cookies, and a second refresh would invalidate the rotated token.

Session cookies are our own — `resolve_access` (1h) and `resolve_refresh` (7d) — `httpOnly`, `sameSite: 'lax'`, `secure` in production.

*Alternative rejected:* refresh-on-401 inside the fetch client. It races with itself on parallel Suspense boundaries and cannot persist the rotated token.

### D3 — `no-store` reads plus path revalidation, not tagged caching

Every response is per-owner, authenticated, and expires at the owner's local midnight. `apiFetch` defaults to `cache: 'no-store'`; freshness after writes comes from `revalidatePath`. React's `cache()` wraps each reader for per-request deduplication only.

A `lib/api/tags.ts` module still defines tag constants so a specific view can opt into `force-cache` + `revalidateTag` later without a refactor, but nothing opts in initially.

*Alternative rejected:* `force-cache` with tags everywhere. Tag invalidation cannot express "this went stale because the clock passed midnight in Asia/Dhaka."

### D4 — URL is the state container for filters, sorting, paging, and ranges

The library page and the insights range picker write to `searchParams`. Client Components read them through `useSearchParams` inside a `<Suspense>` boundary (required, or the route bails to CSR); navigation uses `useRouter().replace` with `startTransition` so a pending state can be shown while the server re-renders.

*Why:* shareable, bookmarkable, back-button-correct, and server-rendered for free.

### D5 — A single date module, and no client-side date math

`lib/date.ts` provides `formatLocalDate(LocalDate)`, `formatInstant(Instant, timezone)`, `compareLocalDate(a, b)`, and `todayInZone(timezone)`, built on `date-fns` + `date-fns-tz`. `LocalDate` strings are never passed through `new Date()` for locale formatting; instants are always formatted against the timezone the API reported.

`daysOverdue`, `practiceState`, and every timeline date are rendered as given. The types (`LocalDate` vs `Instant`) exist specifically so a mix-up is a type error at the boundary.

### D6 — Motion as a token layer, not a library dependency

Durations, easings, and stagger steps live as CSS custom properties in `app/globals.css`. Entrances, hovers, and crossfades are CSS animations and transitions on `transform` / `opacity` only. The two cases needing JS — count-up numerals and the streak ring — use the Web Animations API in small Client Component leaves. Route transitions use the View Transitions API with graceful degradation.

Charts come from the `@bklit` shadcn registry, which handles enter animation internally (~1100ms cartesian default) and exposes `revealSignature` for replay on range changes. Chart colors come exclusively from `chartCssVars` / `--chart-*`.

A single global `@media (prefers-reduced-motion: reduce)` block neutralizes durations and delays, and the JS leaves check the media query before animating.

*Alternative rejected:* Framer Motion. It would be the largest client dependency in the app, pull layout animation into pages that are otherwise fully server-rendered, and duplicate what the token layer and Bklit already provide.

*Alternative rejected:* hand-rolled SVG charts. The registry components are installed as source, already themed and animated, and already handle reduced motion.

### D7 — Animated leaves, server parents

Every animated component is the smallest possible Client Component. `<AnimatedNumber value={7} />` is a client leaf; the Server Component that fetched the 7 stays a Server Component. Suspense boundaries wrap the data-fetching sections so the shell paints immediately and skeletons match the resolved layout's footprint exactly — a crossfade over a shifting layout looks worse than no animation at all.

### D8 — Theming with `next-themes`, dark as the default

`ThemeProvider` with `attribute="class"`, `defaultTheme="dark"`, `enableSystem`, and `disableTransitionOnChange`; `suppressHydrationWarning` on `<html>`. The existing `@custom-variant dark (&:is(.dark *))` in `globals.css` already matches this strategy, so the token structure is extended rather than replaced.

Practice states and difficulties get dedicated semantic token pairs (not reused `destructive` / `warning`), defined once and consumed everywhere, each meeting WCAG AA against its surface in both palettes. Color is never the sole signal — every state carries a label or icon.

### D9 — Compound components over boolean props

Following the Vercel composition guidance: `ProblemCard.Root / .Header / .Meta / .Actions` rather than `<ProblemCard compact showActions />`. Filter state is lifted into a provider that owns URL synchronization, so the filter bar's controls do not each know how the URL is written. Explicit variant components (`DueProblemCard`, `LibraryProblemRow`) instead of mode flags. React 19 means no `forwardRef` and `use()` instead of `useContext()`.

### D10 — Forms validate twice, deliberately

Client-side Zod schemas mirror the backend's constraints (duration 1–1440, confidence 1–5, notes ≤2000, title ≤300, statement ≤20000, no future `attemptedAt`) so the common failures never cost a round trip. The server's `errorDetails.issues[]` remains the authority and is mapped onto fields through `ApiError.fieldErrors`; the concatenated top-level `message` is never used as a field label.

Numbers are sent as JSON numbers and booleans as JSON booleans — the backend schemas do not coerce.

### D11 — Route structure

```
proxy.ts
app/
├── layout.tsx                    ThemeProvider, fonts, metadata, Toaster
├── (auth)/login/                 page + login-form + actions
└── (app)/
    ├── layout.tsx                shell, nav, owner menu, ReminderBanner
    ├── dashboard/                Today — streamed sections
    ├── problems/                 library, new/, [id]/
    ├── topics/
    ├── insights/
    ├── settings/
    └── _components/              shell, reminder, motion primitives
lib/
├── api/   types · http · tags · problems · dashboard · insights · topics · settings · reminders · user
├── date.ts
└── motion.ts
```

`app/page.tsx` becomes a redirect to `/dashboard`.

### D12 — Ship in dependency order

Foundations (types, client, date module, theming, motion tokens, proxy, login) land first because everything else consumes them, and they are the layer where the API's sharp edges are absorbed. Dashboard follows, then library and capture, then detail and attempts — the vertical slice that makes the product usable — then topics, insights, settings, and reminders.

## Risks / Trade-offs

- **Rotation race despite single-flight** → Two browser tabs navigating simultaneously can each trigger a proxy refresh and one will get a `401`. Mitigation: proactive 5-minute skew means the window is small; a failed refresh cleanly clears cookies and redirects to `/login` rather than looping.
- **`no-store` on every read costs a round trip per navigation** → Accepted deliberately: a single-user local-first app has no fan-out, and correctness at the local-midnight boundary is worth more than a cached list. Suspense streaming hides most of the latency.
- **`PUT /api/users/my-profile` 404s when no profile row exists**, even for a name-only update, and the seed does not create one → Mitigation: detect the `404` specifically on that endpoint and render a targeted explanation instead of the generic not-found page.
- **Rich animation can degrade perceived performance** → Mitigation: compositor-only properties, motion confined to client leaves, no animation blocking data, and a hard reduced-motion cutoff.
- **`@bklit` registry availability and API drift** → Mitigation: charts are installed as source into the repo, so the registry is a one-time dependency; chart usage is confined behind our own wrappers so a swap touches few files.
- **Theme flash on first paint** → Mitigation: `next-themes` injects its blocking script; verified by hard-reloading in both themes.
- **Client-side validation drifting from server rules** → Mitigation: the constraints live in one `lib/validation.ts` module referenced by every form, and the server remains authoritative.
- **`RevisionEvent.id` instability** → Mitigation: keys derived from `type + createdAt`; a lint-level convention plus a code comment at the render site.
- **Next.js 16 API differences from training data** → Mitigation: consult `node_modules/next/dist/docs/` before writing route conventions, per `AGENTS.md`; notably `proxy.ts` (not `middleware.ts`) and async `params` / `searchParams` / `cookies()`.

## Migration Plan

Not a migration — this is the first implementation on an empty scaffold. Deployment prerequisites:

1. Set `API_BASE_URL` in `.env.local` (server-only, **not** `NEXT_PUBLIC_`).
2. Set the backend's `APP_URL` to the Next.js origin, or CORS rejects any stray browser call.
3. Seed the owner account server-side (`bun run seed` on the API) — there is no registration path.

Rollback is `git revert`; no data migration exists and no backend change is involved.

## Open Questions

- **Dashboard route naming.** The reminder API returns `targetPath: "/dashboard/today"` while this design uses `/dashboard`. Resolved by mapping the path in the banner rather than reshaping our routes — but if a `/dashboard/today` alias is preferred later, it is a one-line redirect.
- **Insights range presets.** Which presets to offer (7d / 30d / 90d / 365d / custom) is a product call; the 365-day API cap bounds whatever is chosen.
- **Streak visualization.** A radial ring versus a seven-day dot strip — decided during implementation against the real data density.
