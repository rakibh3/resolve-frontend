"use client"

import { useEffect } from "react"
import Link from "next/link"
import { RotateCcwIcon } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="animate-fade-in-up mx-auto flex max-w-md flex-col items-start gap-4 py-16">
      <h1 className="font-heading text-xl font-semibold tracking-tight">
        Something went wrong
      </h1>
      <p className="text-sm text-muted-foreground">
        {error.message || "The request failed before it could be completed."}
      </p>
      {error.digest ? (
        <p className="font-mono text-xs text-muted-foreground">
          Reference: {error.digest}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button onClick={reset}>
          <RotateCcwIcon aria-hidden />
          Try again
        </Button>
        <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
          Back to today
        </Link>
      </div>
    </div>
  )
}
