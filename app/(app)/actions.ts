"use server"

import { redirect } from "next/navigation"

import { clearSession, getRefreshToken } from "@/lib/session"

/**
 * Ends the session.
 *
 * The API call is best-effort: it invalidates the stored refresh token so it
 * cannot be replayed, but if it fails the local session is cleared anyway —
 * being unable to reach the API must never leave the owner stuck signed in.
 */
export async function logout() {
  const refreshToken = await getRefreshToken()

  if (refreshToken) {
    await fetch(`${process.env.API_BASE_URL}/api/auth/logout`, {
      method: "POST",
      headers: { cookie: `refreshToken=${refreshToken}` },
      cache: "no-store",
    }).catch(() => {})
  }

  await clearSession()
  redirect("/login")
}
