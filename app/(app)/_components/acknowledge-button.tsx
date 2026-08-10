"use client"

import { useTransition } from "react"

import { Button } from "@/components/ui/button"

import { acknowledgeReminder } from "./reminder-actions"

export function AcknowledgeButton() {
  const [pending, startTransition] = useTransition()

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => acknowledgeReminder())}
    >
      {pending ? "Dismissing…" : "Got it"}
    </Button>
  )
}
