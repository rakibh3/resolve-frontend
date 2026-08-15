import Link from "next/link"
import { PartyPopperIcon } from "lucide-react"

import { FadeInUp } from "@/components/motion/fade-in-up"
import { buttonVariants } from "@/components/ui/button"

export function CaughtUp() {
  return (
    <FadeInUp
      index={1}
      className="flex flex-col items-start gap-3 rounded-none border-2 border-foreground bg-state-mastered/40 p-6 shadow-[var(--shadow-neo)]"
    >
      <span className="flex size-10 items-center justify-center rounded-none bg-state-mastered text-state-mastered-foreground">
        <PartyPopperIcon className="size-5" aria-hidden />
      </span>
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-lg font-semibold tracking-tight text-state-mastered-foreground">
          You&rsquo;re all caught up
        </h2>
        <p className="text-sm text-state-mastered-foreground/85">
          Nothing is due today and nothing is overdue. Add a problem, or get
          ahead on something scheduled.
        </p>
      </div>
      <div className="flex gap-2">
        <Link href="/problems/new" className={buttonVariants({ size: "sm" })}>
          Add a problem
        </Link>
        <Link
          href="/problems"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Browse the library
        </Link>
      </div>
    </FadeInUp>
  )
}
