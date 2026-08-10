"use server"

import { redirect } from "next/navigation"

import { ApiError, apiFetch } from "@/lib/api/http"
import type { AuthTokens } from "@/lib/api/types"
import { writeSession } from "@/lib/session"

export type LoginState = {
  message?: string
  fieldErrors?: Record<string, string>
  /**
   * The submitted email, echoed back so the form can restore it.
   *
   * React resets an uncontrolled form once its action resolves, so without this
   * a mistyped password also clears the email — and since the field is
   * `required`, the next submit is then blocked by the browser with no visible
   * explanation. The password is deliberately not echoed.
   */
  email?: string
}

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")

  if (!email || !password) {
    return {
      email,
      fieldErrors: {
        ...(email ? {} : { email: "Enter your email address" }),
        ...(password ? {} : { password: "Enter your password" }),
      },
    }
  }

  let tokens: AuthTokens
  try {
    const result = await apiFetch<AuthTokens>("/api/auth/login", {
      method: "POST",
      body: { email, password },
    })
    tokens = result.data
  } catch (error) {
    if (error instanceof ApiError) {
      // 401 is a password mismatch and 404 is an unknown email. Rendering them
      // identically keeps the form from disclosing which addresses exist.
      if (error.status === 401 || error.status === 404) {
        return { email, message: "Invalid email or password." }
      }
      return { email, message: error.message, fieldErrors: error.fieldErrors }
    }
    return { email, message: "Could not reach the server. Try again." }
  }

  await writeSession(tokens)

  // Outside the try/catch — redirect() throws a control-flow exception by design.
  redirect("/dashboard")
}
