"use client"

import { useState } from "react"
import { CheckIcon } from "lucide-react"

import { AttemptForm } from "@/app/(app)/_components/attempt-form"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

/**
 * Logging an attempt without leaving the dashboard.
 *
 * On success the action revalidates `/dashboard`, so the counters, the streak,
 * and the due list all re-render from the server — the item leaves the list
 * because the server says it is no longer due, not because this component
 * removed it.
 */
export function QuickLogButton({
  problemId,
  title,
  timezone,
}: {
  problemId: string
  title: string
  timezone: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <CheckIcon aria-hidden />
        Log attempt
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Log an attempt</DialogTitle>
          <DialogDescription>{title}</DialogDescription>
        </DialogHeader>

        <AttemptForm
          problemId={problemId}
          timezone={timezone}
          compact
          onLogged={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
