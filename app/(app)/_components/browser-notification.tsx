"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { BellIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { LocalDate } from "@/lib/api/types"
import { useMounted } from "@/lib/use-mounted"

type BrowserNotificationProps = {
  title: string
  body: string
  /** Already mapped onto this app's routes by the banner. */
  targetPath: string
  /** The owner's local date, so a notification fires at most once per day. */
  localDate: LocalDate
}

const STORAGE_KEY = "resolve:last-notified-date"

/**
 * An opt-in browser notification carrying the API's own copy.
 *
 * Permission is only ever requested from a user gesture — never automatically
 * on load — and a denied or unsupported Notification API degrades silently to
 * the in-app banner, which is the primary channel regardless.
 */
export function BrowserNotification({
  title,
  body,
  targetPath,
  localDate,
}: BrowserNotificationProps) {
  const router = useRouter()
  const mounted = useMounted()
  const [granted, setGranted] = useState<NotificationPermission | null>(null)

  const supported = mounted && typeof Notification !== "undefined"
  const permission = supported ? (granted ?? Notification.permission) : null

  const raise = useCallback(() => {
    if (typeof Notification === "undefined") return
    if (Notification.permission !== "granted") return
    // At most one notification per local date; the date rolls over on its own.
    if (localStorage.getItem(STORAGE_KEY) === localDate) return

    localStorage.setItem(STORAGE_KEY, localDate)
    const notification = new Notification(title, { body })
    notification.onclick = () => {
      window.focus()
      router.push(targetPath)
    }
  }, [title, body, targetPath, localDate, router])

  useEffect(() => {
    if (permission === "granted") raise()
  }, [permission, raise])

  // Nothing to offer before mount, without the API, or once already granted.
  if (permission === null || permission === "granted") return null

  if (permission === "denied") {
    return (
      <p className="text-xs text-muted-foreground">
        Browser notifications are blocked for this site.
      </p>
    )
  }

  return (
    <Button
      variant="ghost"
      size="xs"
      onClick={() => {
        void Notification.requestPermission().then(setGranted)
      }}
    >
      <BellIcon aria-hidden />
      Notify me in the browser
    </Button>
  )
}
