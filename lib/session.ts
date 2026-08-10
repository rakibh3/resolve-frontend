import "server-only"

import { cookies } from "next/headers"

import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/api/http"

/**
 * Next.js's own first-party session cookies.
 *
 * The API also sets cookies of its own, but with `SameSite=None; Secure=false`
 * — a combination browsers reject — so they are ignored entirely. These are the
 * only session cookies that matter, and neither token ever reaches client JS.
 */

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

export async function writeSession(tokens: {
  accessToken: string
  refreshToken: string
}) {
  const jar = await cookies()
  jar.set(ACCESS_COOKIE, tokens.accessToken, sessionCookie(ACCESS_MAX_AGE))
  jar.set(REFRESH_COOKIE, tokens.refreshToken, sessionCookie(REFRESH_MAX_AGE))
}

export async function clearSession() {
  const jar = await cookies()
  jar.delete(ACCESS_COOKIE)
  jar.delete(REFRESH_COOKIE)
}

export async function getRefreshToken() {
  return (await cookies()).get(REFRESH_COOKIE)?.value
}
