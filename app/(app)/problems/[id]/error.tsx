"use client"

import { useEffect } from "react"
import Link from "next/link"
import { RotateCcwIcon } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"

export default function ProblemError({
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
    <div className="animate-fade-in-up flex max-w-md flex-col items-start gap-4 py-16">
      <h1 className="font-heading text-xl font-semibold tracking-tight">
        Couldn&rsquo;t load this problem
      </h1>
      <p className="text-sm text-muted-foreground">
        {error.message ||
          "The request failed before the problem could be loaded."}
      </p>
      <div className="flex gap-2">
        <Button onClick={reset}>
          <RotateCcwIcon aria-hidden />
          Try again
        </Button>
        <Link href="/problems" className={buttonVariants({ variant: "outline" })}>
          Back to the library
        </Link>
      </div>
    </div>
  )
}
