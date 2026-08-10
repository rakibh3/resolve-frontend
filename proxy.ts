import { NextResponse, type NextRequest } from "next/server"

/**
 * Session guard and the application's ONLY token-refresh site.
 *
 * The ReSolve API rotates refresh tokens: a successful refresh deletes the old
 * row and inserts a new one, so two concurrent refreshes race and the loser's
 * token is already dead. The proxy runs once per navigation, before rendering,
 * and is the only place that can both write cookies and guarantee every Server
 * Component below it sees a valid token — so refresh happens here and nowhere
 * else. `apiFetch` deliberately does not retry on 401.
 *
 * Refresh is proactive, on a 5-minute skew against the JWT `exp`, rather than
 * reactive, for the same reason.
 */

const ACCESS_COOKIE = "resolve_access"
const REFRESH_COOKIE = "resolve_refresh"

const LOGIN_PATH = "/login"
const PUBLIC_PATHS = [LOGIN_PATH]

/** Refresh when the access token has under five minutes left. */
const REFRESH_SKEW_MS = 5 * 60 * 1000

const ACCESS_MAX_AGE = 60 * 60
const REFRESH_MAX_AGE = 60 * 60 * 24 * 7

function sessionCookie(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  }
}

/**
 * The token's expiry in epoch milliseconds.
 *
 * Returns `0` on any parse failure, which reads as "already expired" and forces
 * a refresh attempt — a malformed token should never throw out of the proxy.
 */
function expiresAt(jwt: string): number {
  try {
    const segment = jwt.split(".")[1] ?? ""
    const payload = JSON.parse(
      Buffer.from(segment, "base64url").toString(),
    ) as { exp?: number }
    return (payload.exp ?? 0) * 1000
  } catch {
    return 0
  }
}

function redirectToLogin(request: NextRequest) {
  const response = NextResponse.redirect(new URL(LOGIN_PATH, request.url))
  response.cookies.delete(ACCESS_COOKIE)
  response.cookies.delete(REFRESH_COOKIE)
  return response
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value

  if (!accessToken && !refreshToken) {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url))
  }

  const needsRefresh =
    !accessToken || expiresAt(accessToken) - Date.now() < REFRESH_SKEW_MS

  if (!needsRefresh) return NextResponse.next()
  if (!refreshToken) return redirectToLogin(request)

  let refreshed: { accessToken: string; refreshToken: string }
  try {
    // The API reads the refresh token from its OWN cookie name, not from a
    // body or an Authorization header.
    const response = await fetch(
      `${process.env.API_BASE_URL}/api/auth/refresh-token`,
      {
        method: "POST",
        headers: { cookie: `refreshToken=${refreshToken}` },
        cache: "no-store",
      },
    )

    if (!response.ok) return redirectToLogin(request)

    const payload = (await response.json()) as {
      data?: { accessToken?: string; refreshToken?: string }
    }

    if (!payload.data?.accessToken || !payload.data.refreshToken) {
      return redirectToLogin(request)
    }

    refreshed = {
      accessToken: payload.data.accessToken,
      refreshToken: payload.data.refreshToken,
    }
  } catch {
    // The API is unreachable. Clearing the session and sending the owner to
    // /login is better than rendering every page as a broken 401.
    return redirectToLogin(request)
  }

  // Rewrite the REQUEST cookies so this render already sees the new token —
  // setting them only on the response would leave the current page rendering
  // with the token that is about to expire.
  request.cookies.set(ACCESS_COOKIE, refreshed.accessToken)
  request.cookies.set(REFRESH_COOKIE, refreshed.refreshToken)

  const next = NextResponse.next({ request: { headers: request.headers } })
  next.cookies.set(ACCESS_COOKIE, refreshed.accessToken, sessionCookie(ACCESS_MAX_AGE))
  next.cookies.set(
    REFRESH_COOKIE,
    refreshed.refreshToken,
    sessionCookie(REFRESH_MAX_AGE),
  )
  return next
}

/**
 * Note: Next.js 16.3 reads the matcher from an export named `config`. The
 * integration guide calls it `proxyConfig`; that name is not recognised by this
 * version and would silently run the proxy on every request, including static
 * assets.
 */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login).*)"],
}
