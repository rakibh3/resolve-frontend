import "server-only"

import { cache } from "react"

import { apiFetch } from "./http"
import type { Owner } from "./types"

/**
 * The owner's account record. Note the `profile` relation is NOT included here
 * (unlike `PUT /api/users/my-profile`).
 */
export const getOwner = cache(async () => {
  const { data } = await apiFetch<Owner>("/api/users/me")
  return data
})
