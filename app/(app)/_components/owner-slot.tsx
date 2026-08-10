import { ApiError } from "@/lib/api/http"
import { getOwner } from "@/lib/api/user"

import { OwnerMenu, type OwnerSummary } from "./owner-menu"

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase()
}

/**
 * The owner identity in the shell header.
 *
 * A failed lookup renders a neutral placeholder rather than taking down every
 * page — an expired session is already handled by the proxy redirect, so a
 * non-401 failure here is a backend problem, not an auth problem.
 */
export async function OwnerSlot() {
  let owner: OwnerSummary | null = null

  try {
    const data = await getOwner()
    owner = {
      name: data.name,
      email: data.email,
      initials: initialsOf(data.name),
    }
  } catch (error) {
    if (!(error instanceof ApiError)) throw error
  }

  return <OwnerMenu owner={owner} />
}
