## ADDED Requirements

### Requirement: Route group separation
The application SHALL separate authenticated routes from the login route using route groups, so the authenticated shell never renders on `/login`.

#### Scenario: Authenticated layout
- **WHEN** any route under the `(app)` group renders
- **THEN** it is wrapped in the shell layout containing navigation, the owner menu, and the reminder banner slot

#### Scenario: Login layout
- **WHEN** `/login` renders
- **THEN** no navigation, owner menu, or reminder banner appears

### Requirement: Primary navigation
The shell SHALL provide navigation to Dashboard, Library, Topics, Insights, and Settings, with the active route visibly and programmatically indicated.

#### Scenario: Active route
- **WHEN** the owner is on `/insights`
- **THEN** the Insights item is styled as active and carries `aria-current="page"`

#### Scenario: Mobile navigation
- **WHEN** the viewport is narrow
- **THEN** navigation collapses into a toggleable drawer that traps focus while open and restores focus to the trigger on close

#### Scenario: Keyboard navigation
- **WHEN** the owner tabs through the shell
- **THEN** every interactive element is reachable in a logical order and shows a visible focus ring

### Requirement: Root redirect
The root route SHALL send an authenticated owner to the dashboard rather than rendering a landing page.

#### Scenario: Visiting the root
- **WHEN** an authenticated owner requests `/`
- **THEN** they are redirected to `/dashboard`

### Requirement: Global capture entry point
The shell SHALL expose a persistent "Add problem" action reachable from every authenticated route.

#### Scenario: Capture from anywhere
- **WHEN** the owner activates the capture action from any page
- **THEN** the capture flow opens without losing the current page's scroll position or filter state

### Requirement: Route boundaries
Every data-backed route segment SHALL provide `loading.tsx`, and the tree SHALL provide `error.tsx` and `not-found.tsx` boundaries.

#### Scenario: Slow data
- **WHEN** a route's data is still resolving
- **THEN** a skeleton matching the final layout's shape and spacing is shown, not a spinner in an empty page

#### Scenario: Unknown problem id
- **WHEN** the API responds `404` for a problem
- **THEN** `notFound()` is invoked and the not-found boundary renders with a route back to the library

#### Scenario: Unexpected failure
- **WHEN** any other API error propagates
- **THEN** the nearest error boundary renders a readable message and a working retry control

#### Scenario: Control-flow exceptions are not swallowed
- **WHEN** a page calls `notFound()`, `redirect()`, or `unauthorized()`
- **THEN** the call is made outside `try`/`catch`, or the caught error is re-thrown with `unstable_rethrow`

### Requirement: Async route APIs
All route handlers and page components SHALL await `params`, `searchParams`, `cookies()`, and `headers()`, per Next.js 16.

#### Scenario: Dynamic segment
- **WHEN** a page reads the problem id from the route
- **THEN** it awaits the `params` promise before use

### Requirement: Suspense boundary for URL state
Any Client Component reading `useSearchParams()` SHALL be rendered inside a `<Suspense>` boundary.

#### Scenario: Filter bar on the library page
- **WHEN** the filter bar reads search params on the client
- **THEN** it is wrapped in Suspense so the route does not bail out to client-side rendering

### Requirement: Owner identity in the shell
The shell SHALL display the owner's name and avatar from `GET /api/users/me`, with a menu containing profile, settings, theme, and logout.

#### Scenario: Owner data loaded
- **WHEN** the shell renders for an authenticated owner
- **THEN** the name and avatar are shown, with initials as the fallback when `profilePhoto` is null

#### Scenario: Owner request fails
- **WHEN** `GET /api/users/me` fails with a non-401 error
- **THEN** the shell still renders with a neutral placeholder rather than blocking the whole page

### Requirement: Metadata and document setup
The root layout SHALL declare accurate application metadata and load fonts through `next/font`.

#### Scenario: Page title
- **WHEN** any page renders
- **THEN** the document title reflects ReSolve and the current section, not "Create Next App"

#### Scenario: Font loading
- **WHEN** fonts load
- **THEN** they are self-hosted via `next/font` with no layout shift from a swap

### Requirement: Responsive layout
Every route SHALL be usable from a 360px-wide viewport up to wide desktop without horizontal page scrolling.

#### Scenario: Narrow viewport
- **WHEN** the library table is viewed at 360px
- **THEN** the table scrolls within its own container while the page body does not scroll horizontally

### Requirement: Toast notifications
The shell SHALL host a single toast region used by all mutation feedback.

#### Scenario: Mutation feedback
- **WHEN** a Server Action reports success or failure
- **THEN** a toast announces it via a polite live region and is dismissible by keyboard
