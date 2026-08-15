"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import { login, type LoginState } from "./actions"

const initialState: LoginState = {}

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState)

  return (
    <form action={formAction} className="flex flex-col gap-6 border-2 border-foreground p-6 bg-card shadow-[var(--shadow-neo-lg)]">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          {/* React resets the form once the action resolves, restoring inputs
              to their defaultValue — so echoing the email back through state is
              what keeps it in the field across a failed attempt. */}
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            autoFocus
            defaultValue={state.email ?? ""}
            aria-invalid={state.fieldErrors?.email ? true : undefined}
            aria-describedby={
              state.fieldErrors?.email ? "email-error" : undefined
            }
          />
          {state.fieldErrors?.email && (
            <FieldError id="email-error">{state.fieldErrors.email}</FieldError>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            aria-invalid={state.fieldErrors?.password ? true : undefined}
            aria-describedby={
              state.fieldErrors?.password ? "password-error" : undefined
            }
          />
          {state.fieldErrors?.password && (
            <FieldError id="password-error">
              {state.fieldErrors.password}
            </FieldError>
          )}
        </Field>
      </FieldGroup>

      {/* The form-level message is the API's summary, never a field label. */}
      {state.message && (
        <p
          role="alert"
          aria-live="polite"
          className="rounded-none border-2 border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive font-bold"
        >
          {state.message}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  )
}
