import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"

export default function AppNotFound() {
  return (
    <div className="animate-fade-in-up mx-auto flex max-w-md flex-col items-start gap-4 py-16">
      <h1 className="font-heading text-xl font-semibold tracking-tight">
        Not found
      </h1>
      <p className="text-sm text-muted-foreground">
        That problem is not in your library — it may have been deleted, or the
        link may be wrong.
      </p>
      <Link href="/problems" className={buttonVariants()}>
        Back to the library
      </Link>
    </div>
  )
}
