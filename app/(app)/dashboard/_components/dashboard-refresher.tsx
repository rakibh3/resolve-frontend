"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * Keeps the dashboard honest across the owner's local midnight.
 *
 * Every figure on this page is derived from "today" in the owner's timezone, so
 * a tab left open overnight would otherwise show yesterday's `DUE` badges after
 * they have silently become `OVERDUE`. Refreshing lets the server re-derive
 * them rather than reclassifying anything on the client.
 *
 * The interval is ten minutes, not seconds: every authenticated request writes
 * `lastActiveAt` on the user row.
 */
const REFRESH_INTERVAL_MS = 10 * 60 * 1000

export function DashboardRefresher() {
  const router = useRouter()

  useEffect(() => {
    const interval = setInterval(() => router.refresh(), REFRESH_INTERVAL_MS)

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") router.refresh()
    }
    document.addEventListener("visibilitychange", onVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [router])

  return null
}
