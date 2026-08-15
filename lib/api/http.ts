import "server-only"

import { cookies } from "next/headers"

import type {
  ApiEnvelope,
  ApiErrorBody,
  ApiErrorIssue,
  ApiMeta,
} from "./types"

/**
 * The API origin, without the `/api` prefix — request paths carry it.
 *
 * Server-only on purpose. Prefixing this with `NEXT_PUBLIC_` would leak the
 * API's address to a browser that can never successfully call it: the API's
 * cookies are `SameSite=None; Secure=false` and its CORS allowlist is a single
 * origin.
 */
const BASE_URL = process.env.API_BASE_URL

if (!BASE_URL) {
  throw new Error(
    "API_BASE_URL is not set. Copy .env.example to .env.local and set it to the ReSolve API origin.",
  )
}

/** The cookie Next.js keeps the access token in. Never sent to the browser's JS. */
export const ACCESS_COOKIE = "resolve_access"
/** The cookie Next.js keeps the (rotating) refresh token in. */
export const REFRESH_COOKIE = "resolve_refresh"

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiErrorBody,
  ) {
    super(body.message ?? `Request failed with ${status}`)
    this.name = "ApiError"
  }

  /**
   * Zod issues mapped to form field names, ready for form state.
   *
   * The backend Title-Cases the last path segment, so only the first character
   * is lowercased — `"SourceUrl"` becomes `"sourceUrl"`, not `"sourceurl"`.
   */
  get fieldErrors(): Record<string, string> {
    const issues: ApiErrorIssue[] = this.body.errorDetails?.issues ?? []
    return Object.fromEntries(
      issues.map((issue) => [
        issue.path.charAt(0).toLowerCase() + issue.path.slice(1),
        issue.message,
      ]),
    )
  }

  get isUnauthorized() {
    return this.status === 401
  }

  get isNotFound() {
    return this.status === 404
  }

  get isValidationError() {
    return this.status === 400
  }

  /** 422 = LeetCode metadata could not be resolved; fall back to manual entry. */
  get needsManualMetadata() {
    return this.status === 422
  }

  /** Echoed with the 422 so the manual form can be pre-filled. */
  get canonicalUrl(): string | undefined {
    const value = this.body.errorDetails?.canonicalUrl
    return typeof value === "string" ? value : undefined
  }
}

/**
 * A query value. Arrays are serialized comma-separated (the backend parses
 * `difficulty=MEDIUM,HARD`, not repeated keys) and booleans as the string
 * literals `"true"` / `"false"`.
 */
export type QueryValue =
  | string
  | number
  | boolean
  | readonly string[]
  | undefined
  | null

export type QueryParams = Record<string, QueryValue>

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"
  body?: unknown
  /** Query params; `undefined`, `null`, `""`, and empty arrays are dropped. */
  query?: QueryParams
  /** Defaults to `no-store` — all ReSolve data is per-owner and time-sensitive. */
  cache?: RequestCache
  tags?: string[]
}

export type ApiResult<T> = {
  data: T
  meta?: ApiMeta
  message?: string
  /**
   * The HTTP status.
   *
   * Needed because a couple of endpoints distinguish two successes only by
   * status: `PUT .../recall` answers 201 on create and 200 on replace, and
   * `POST /api/problems` answers 201 on create and 200 for a URL already in the
   * library. The body cannot always tell them apart.
   */
  statusCode: number
}

function serializeQuery(url: URL, query: QueryParams | undefined) {
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === "") continue

    if (Array.isArray(value)) {
      const items = value.filter((item) => item !== "")
      if (items.length === 0) continue
      url.searchParams.set(key, items.join(","))
      continue
    }

    url.searchParams.set(key, String(value))
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResult<T>> {
  const { method = "GET", body, query, cache = "no-store", tags } = options

  const url = new URL(`${BASE_URL}${path}`)
  serializeQuery(url, query)

  const token = (await cookies()).get(ACCESS_COOKIE)?.value

  const response = await fetch(url, {
    method,
    headers: {
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
      // NOTE: raw JWT. The API reads `req.headers.authorization` and verifies
      // it directly — a "Bearer " prefix makes verification fail with a 401.
      ...(token ? { authorization: token } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache,
    ...(tags ? { next: { tags } } : {}),
  })

  const payload = (await response.json().catch(() => null)) as
    | ApiEnvelope<T>
    | ApiErrorBody
    | null

  if (!response.ok || !payload || payload.success === false) {
    throw new ApiError(
      response.status,
      (payload as ApiErrorBody | null) ?? {
        success: false,
        message: "Network error",
      },
    )
  }

  return {
    data: payload.data,
    meta: payload.meta,
    message: payload.message,
    statusCode: response.status,
  }
}
