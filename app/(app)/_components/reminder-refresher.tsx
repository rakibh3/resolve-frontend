"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * Keeps the reminder state (and everything else the layout renders) current
 * while the app sits open past the reminder time.
 *
 * The cadence is minutes, deliberately. Every authenticated request writes
 * `lastActiveAt` on the user row, so a seconds-scale poll would turn an idle
 * tab into a steady write load on the database.
 */
const REFRESH_INTERVAL_MS = 5 * 60 * 1000

export function ReminderRefresher() {
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
