import type { Metadata } from "next"

import { LoginForm } from "./login-form"

export const metadata: Metadata = {
  title: "Sign in",
}

export default function LoginPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-6 py-12">
      <div className="animate-fade-in-up w-full max-w-sm">
        <div className="mb-8 flex flex-col gap-2">
          <span className="text-xs font-bold tracking-[0.25em] text-muted-foreground uppercase">
            ReSolve
          </span>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight">
            Sign in
          </h1>
          <p className="text-sm text-muted-foreground">
            Pick up your revision schedule where you left it.
          </p>
        </div>

        <LoginForm />

        <p className="mt-8 text-xs text-muted-foreground">
          ReSolve is single-owner by design — there is no sign-up. The account
          is created by the API&rsquo;s seed script.
        </p>
      </div>
    </main>
  )
}
