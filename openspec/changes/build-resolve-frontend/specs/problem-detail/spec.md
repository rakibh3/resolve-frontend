## ADDED Requirements

### Requirement: Single-request detail view
The `/problems/[id]` route SHALL render metadata, attempts, revision events, and the projected timeline from one `GET /api/problems/:id` request.

#### Scenario: Detail loads
- **WHEN** the page renders
- **THEN** no additional request is made for the attempt list or revision log, since the detail response already contains the full history

#### Scenario: Unknown problem
- **WHEN** the API responds `404`
- **THEN** `notFound()` is invoked outside any `try`/`catch` and the not-found boundary renders

#### Scenario: Malformed id
- **WHEN** the API responds `400` for an unparseable id
- **THEN** the same not-found treatment is shown rather than a generic error

### Requirement: Revision timeline
The detail page SHALL render the five-stage timeline with each stage's date and completed / current / upcoming status.

#### Scenario: Active cycle
- **WHEN** `timeline` has five entries
- **THEN** all five stages render in order with their dates and status, and the current stage is visually distinguished

#### Scenario: No cycle yet
- **WHEN** `cycleStartsOnFirstAttempt` is true and `timeline` is empty
- **THEN** an empty state explains that logging the first attempt starts the cycle, instead of rendering an empty timeline

#### Scenario: Timeline is never computed client-side
- **WHEN** stage dates are displayed
- **THEN** they come from the server's `timeline` and are not derived from the anchor plus stage offsets

#### Scenario: Timeline animation
- **WHEN** the timeline first appears
- **THEN** its stages reveal in sequence, and appear instantly under reduced-motion preferences

### Requirement: Attempt history display
The detail page SHALL list every attempt newest-first with outcome, duration, confidence, notes, and attempt date.

#### Scenario: Attempt row
- **WHEN** an attempt is rendered
- **THEN** its outcome is shown as readable copy, its duration in minutes, its confidence out of 5, and its date rendered in the owner's timezone

#### Scenario: No attempts
- **WHEN** the problem has no attempts
- **THEN** an empty state prompts the owner to log the first attempt

### Requirement: Revision event feed
The detail page SHALL render the revision event log with per-type copy.

#### Scenario: Event copy
- **WHEN** events of type `CYCLE_STARTED`, `COMPLETED`, `ADVANCED`, `REPEATED`, `RESET`, `RESCHEDULED`, `MASTERED`, or `REINFORCEMENT_STARTED` render
- **THEN** each shows human-readable copy naming the stage rather than the raw enum

#### Scenario: Reschedule reason shown
- **WHEN** a `RESCHEDULED` event renders
- **THEN** its `reason` is displayed

#### Scenario: Unstable identifiers
- **WHEN** revision events are keyed for rendering
- **THEN** the key is derived from `type` and `createdAt` or the array index, never from `RevisionEvent.id`, which is rewritten on every replay

#### Scenario: Instants rendered in owner timezone
- **WHEN** `fromDueAt` and `toDueAt` render
- **THEN** they are formatted against the owner's timezone, not the browser's

### Requirement: Metadata editing
The detail page SHALL allow editing title, difficulty, topics, source name, source URL, and statement via `PATCH /api/problems/:id`.

#### Scenario: Topics are replaced wholesale
- **WHEN** topics are edited
- **THEN** the full desired topic list is submitted, and the form makes clear that omitted topics are unlinked

#### Scenario: Canonical URL is immutable
- **WHEN** editing a LeetCode problem
- **THEN** the canonical URL field is read-only, since changing it responds `400`

#### Scenario: UNRATED restricted
- **WHEN** editing a LeetCode problem's difficulty
- **THEN** `UNRATED` is not offered

#### Scenario: Clearing an optional field
- **WHEN** the owner clears source name, source URL, or statement
- **THEN** an explicit `null` is sent, because omitting the field leaves it unchanged

#### Scenario: Empty submission blocked
- **WHEN** the owner submits with no field changed
- **THEN** the form blocks the request, since the backend rejects an empty patch body with `400`

#### Scenario: Schedule untouched
- **WHEN** a metadata edit succeeds
- **THEN** the timeline, stage, and due date are unchanged, and the UI does not suggest otherwise

### Requirement: Deletion
The detail page SHALL allow deleting a problem only behind an explicit confirmation that states what is lost.

#### Scenario: Confirmation content
- **WHEN** the delete control is activated
- **THEN** the confirmation names the problem and states that its attempts, topic links, revision schedule, and revision history are permanently removed with no undo

#### Scenario: Successful deletion
- **WHEN** deletion succeeds
- **THEN** `/problems`, `/dashboard`, `/insights`, and `/topics` are revalidated and the owner is redirected to the library

### Requirement: Rescheduling the current revision
The detail page SHALL allow moving the current stage's due date via `PATCH /api/problems/:id/revisions/reschedule`, with a mandatory reason.

#### Scenario: Reason required
- **WHEN** the reschedule form is submitted with an empty or whitespace-only reason
- **THEN** submission is blocked client-side and the reason field is marked required

#### Scenario: Date format
- **WHEN** a date is chosen from a date input
- **THEN** the `yyyy-MM-dd` value is sent verbatim and is not converted to an ISO instant

#### Scenario: Past dates prevented
- **WHEN** the date picker renders
- **THEN** its minimum is the owner's local today, taken from the API, so a past date cannot be selected

#### Scenario: Control availability
- **WHEN** the problem has no revision cycle, or its practice state is `MASTERED`
- **THEN** the reschedule control is hidden

#### Scenario: Successful reschedule
- **WHEN** the reschedule succeeds
- **THEN** the returned timeline, stage, anchor date, and practice state replace the rendered values, and `/dashboard`, `/problems`, and `/insights` are revalidated

#### Scenario: Server rejection
- **WHEN** the API responds `400` for any reschedule rule
- **THEN** the returned message is shown against the form rather than as a generic failure

### Requirement: External links
The detail page SHALL link out to the problem's origin where one exists.

#### Scenario: LeetCode problem
- **WHEN** a `canonicalUrl` is present
- **THEN** an external link opens it in a new tab with `rel="noopener noreferrer"`

#### Scenario: Custom problem with a source URL
- **WHEN** a `sourceUrl` is present
- **THEN** it is linked and labelled with the `sourceName` when one exists
