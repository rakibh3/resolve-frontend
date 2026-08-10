"use client"

import { useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"

/**
 * The backend treats the literal string `"true"` as true and anything else —
 * including `"1"` — as false, so that exact value is what goes into the URL.
 */
export function UsedOnlyToggle() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  const active = searchParams.get("usedOnly") === "true"

  return (
    <Button
      size="sm"
      variant={active ? "default" : "outline"}
      aria-pressed={active}
      disabled={pending}
      onClick={() => {
        const next = new URLSearchParams(searchParams.toString())
        if (active) next.delete("usedOnly")
        else next.set("usedOnly", "true")
        const query = next.toString()
        startTransition(() =>
          router.replace(query ? `${pathname}?${query}` : pathname, {
            scroll: false,
          }),
        )
      }}
    >
      {active ? "Showing used topics" : "Show used topics only"}
    </Button>
  )
}
