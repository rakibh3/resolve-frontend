# ReSolve — frontend

The web client for ReSolve, a single-owner spaced-repetition tracker for coding
problems. Built on Next.js 16 (App Router), React 19, Tailwind v4, and shadcn
components in the `base-nova` style.

## Architecture in one paragraph

Every read happens in a Server Component; every write happens in a Server
Action. There is no client-side data layer. The ReSolve API issues its own
session cookies as `SameSite=None; Secure=false`, which browsers reject, and its
CORS allowlist is a single origin — so the browser cannot talk to the API at
all. Instead, `proxy.ts` keeps a first-party session in `httpOnly` cookies and
`lib/api/http.ts` (marked `server-only`) attaches the access token to every
outbound request.

## Setup

```bash
pnpm install
cp .env.example .env.local   # then set API_BASE_URL
pnpm dev
```

### Environment

| Variable | Scope | Description |
| --- | --- | --- |
| `API_BASE_URL` | **server-only** | Base URL of the ReSolve API including the `/api` prefix, e.g. `http://localhost:6000/api`. Never prefix it with `NEXT_PUBLIC_` — that would ship the API origin to the browser and invite calls that CORS will reject anyway. |

### Backend prerequisites

1. **`APP_URL` on the API must equal this app's origin** (`http://localhost:3000`
   in development). The API's CORS allowlist is exactly that one origin.
2. **Seed the owner account** on the API (`bun run seed`). ReSolve is
   single-user by design and has no registration endpoint, so there is no way to
   create the account from this app.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Development server |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | ESLint |

## Reference

- `docs/API_INTEGRATION.md` — the authoritative API contract, including the
  gotchas checklist this app is built against.
- `openspec/changes/build-resolve-frontend/` — the proposal, capability specs,
  design decisions, and task breakdown behind this implementation.
