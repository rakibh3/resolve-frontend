## ADDED Requirements

### Requirement: Owner login
The system SHALL provide a `/login` route whose form posts to a Server Action that exchanges email and password for a token pair via `POST /api/auth/login`.

#### Scenario: Valid credentials
- **WHEN** the owner submits a correct email and password
- **THEN** the action stores the tokens and redirects to `/dashboard`

#### Scenario: Invalid credentials
- **WHEN** the API responds `401` (password mismatch) or `404` (unknown email)
- **THEN** both cases render the identical message "Invalid email or password." so the UI does not disclose which emails exist

#### Scenario: Validation failure
- **WHEN** the API responds `400` with Zod issues
- **THEN** the form renders per-field errors from `ApiError.fieldErrors`

#### Scenario: Backend unreachable
- **WHEN** the fetch itself fails
- **THEN** the form renders a recoverable "Could not reach the server. Try again." message and stays on `/login`

#### Scenario: Pending state
- **WHEN** the login action is in flight
- **THEN** the submit control is disabled and shows a pending label, driven by `useActionState`

### Requirement: First-party session cookies
The system SHALL store the tokens in Next.js's own httpOnly cookies named `resolve_access` and `resolve_refresh`, and SHALL ignore the API's own cookies.

#### Scenario: Cookie attributes
- **WHEN** the login action writes the session
- **THEN** both cookies are set with `httpOnly: true`, `sameSite: 'lax'`, `path: '/'`, `secure` in production, and max-ages of 1 hour and 7 days respectively

#### Scenario: Token never reaches the browser
- **WHEN** any page renders
- **THEN** no access or refresh token appears in the client bundle, in serialized props, or in any `NEXT_PUBLIC_` value

### Requirement: Route protection
A root `proxy.ts` exporting `proxy` and `proxyConfig` SHALL guard every route except the declared public paths and static assets.

#### Scenario: Unauthenticated access to a protected route
- **WHEN** a request arrives for `/dashboard` with neither session cookie present
- **THEN** the proxy redirects to `/login`

#### Scenario: Public path
- **WHEN** a request arrives for `/login`
- **THEN** the proxy passes it through without a token check

#### Scenario: Static assets excluded
- **WHEN** a request targets `_next/static`, `_next/image`, or `favicon.ico`
- **THEN** the matcher excludes it so no auth work runs

### Requirement: Proactive single-flight token rotation
The proxy SHALL refresh the access token before it expires — and SHALL be the only place in the application that calls `POST /api/auth/refresh-token` — because the backend rotates refresh tokens and concurrent refreshes lose the race.

#### Scenario: Token close to expiry
- **WHEN** the access token's `exp` is less than 5 minutes away
- **THEN** the proxy calls the refresh endpoint, sending the refresh token as a `Cookie: refreshToken=<token>` header, and writes the returned pair to the response cookies

#### Scenario: Current render sees the new token
- **WHEN** a refresh succeeds during a navigation
- **THEN** the request cookies are rewritten so Server Components rendering below the proxy read the fresh access token in that same render

#### Scenario: Refresh rejected
- **WHEN** the refresh endpoint responds `401` or `404`
- **THEN** the proxy deletes both session cookies and redirects to `/login`

#### Scenario: No retry-on-401 in the fetch client
- **WHEN** `apiFetch` receives a `401`
- **THEN** it throws and does NOT attempt a refresh, because a Server Component cannot write cookies and a second refresh would invalidate the rotated token

#### Scenario: Malformed token payload
- **WHEN** the access token cannot be base64url-decoded into a payload with `exp`
- **THEN** the expiry is treated as `0`, forcing a refresh attempt rather than throwing

### Requirement: Logout
The system SHALL provide a logout Server Action that invalidates the refresh token server-side and clears the local session unconditionally.

#### Scenario: Successful logout
- **WHEN** the owner triggers logout with a refresh token present
- **THEN** `POST /api/auth/logout` is called with the refresh token as a cookie header, both local cookies are deleted, and the owner is redirected to `/login`

#### Scenario: Backend call fails
- **WHEN** the logout request to the API errors or times out
- **THEN** the local cookies are still deleted and the redirect still happens

### Requirement: Server-only API base URL
The API base URL SHALL be read from a server-only `API_BASE_URL` environment variable and the application SHALL fail fast when it is missing.

#### Scenario: Missing configuration
- **WHEN** `API_BASE_URL` is unset at module load
- **THEN** the client module throws `API_BASE_URL is not set` rather than issuing requests to `undefined`

#### Scenario: Variable is not public
- **WHEN** the environment is configured
- **THEN** the variable is named `API_BASE_URL`, never `NEXT_PUBLIC_API_BASE_URL`
