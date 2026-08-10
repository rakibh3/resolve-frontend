## ADDED Requirements

### Requirement: Logging an attempt
The system SHALL allow logging an attempt against a problem via `POST /api/problems/:id/attempts`, capturing outcome, duration, confidence, and optional notes.

#### Scenario: Successful log
- **WHEN** the owner submits a valid attempt
- **THEN** the attempt is created and the response's `currentStage`, `nextDueDate`, and `practiceState` are used to update the UI without a follow-up read

#### Scenario: Numeric types
- **WHEN** duration and confidence are submitted
- **THEN** they are sent as JSON numbers, never as strings, because the backend schemas do not coerce

#### Scenario: Notes omitted
- **WHEN** the notes field is left empty
- **THEN** `null` is sent rather than an empty string

#### Scenario: Availability
- **WHEN** a problem is displayed anywhere it can be practised — detail page or dashboard due card
- **THEN** logging an attempt is reachable from that surface

### Requirement: Input validation before submission
The attempt form SHALL enforce the backend's constraints client-side so invalid submissions are caught before a round trip.

#### Scenario: Duration bounds
- **WHEN** a duration outside 1–1440 minutes is entered
- **THEN** the field reports the valid range and submission is blocked

#### Scenario: Confidence bounds
- **WHEN** confidence is set
- **THEN** only integer values 1 through 5 are selectable

#### Scenario: Notes length
- **WHEN** notes exceed 2000 characters
- **THEN** a live character count warns before the limit is passed and submission is blocked beyond it

#### Scenario: Server-side errors still surfaced
- **WHEN** the API nonetheless responds `400` with issues
- **THEN** the messages are mapped onto the corresponding fields via `ApiError.fieldErrors`

### Requirement: Backdating
The attempt form SHALL support backfilling a past session.

#### Scenario: Backdated attempt
- **WHEN** the owner supplies a past `attemptedAt`
- **THEN** it is sent as an ISO instant and the attempt is accepted

#### Scenario: Future dates blocked
- **WHEN** the owner selects a future date or time
- **THEN** submission is blocked client-side, matching the backend's `400`

#### Scenario: Default is now
- **WHEN** the owner does not touch the date field
- **THEN** `attemptedAt` is omitted from the body so the backend defaults to now

#### Scenario: Out-of-order insertion explained
- **WHEN** an attempt is backdated earlier than existing attempts
- **THEN** the UI states the schedule was replayed from the full history, so the result matches in-order logging

### Requirement: Outcome consequences are communicated
The attempt form SHALL explain what each outcome does to the schedule before submission.

#### Scenario: Outcome descriptions
- **WHEN** the outcome options render
- **THEN** `SOLVED_INDEPENDENTLY` is described as advancing the stage, `SOLVED_WITH_HINT` as repeating it, and `VIEWED_SOLUTION` as resetting the cycle

#### Scenario: Viewed-solution warning
- **WHEN** `VIEWED_SOLUTION` is selected
- **THEN** the form warns that the cycle resets to Day 0 and the problem is permanently marked as having had its solution viewed

### Requirement: Schedule delta feedback
Every attempt mutation SHALL report the resulting schedule from the response, never an assumed one.

#### Scenario: Next revision announced
- **WHEN** an attempt is logged and `nextDueDate` is returned
- **THEN** the confirmation names the new stage and next due date

#### Scenario: Mastery reached
- **WHEN** the response has a null `nextDueDate` and mastery was reached
- **THEN** the confirmation states the problem is now mastered rather than showing an empty date

#### Scenario: Solution-viewed flag
- **WHEN** the create response reports `solutionViewed: true`
- **THEN** the problem's indicator updates immediately

### Requirement: Editing an attempt
The system SHALL allow correcting a logged attempt via `PATCH /api/attempts/:id`, which is attempt-scoped rather than problem-scoped.

#### Scenario: Correcting an outcome
- **WHEN** the owner changes an attempt's outcome or confidence
- **THEN** the request targets `/api/attempts/:id` and at least one field is present in the body

#### Scenario: Replay may move the schedule
- **WHEN** an edit succeeds
- **THEN** the returned `currentStage`, `nextDueDate`, and `practiceState` are shown in the confirmation, because editing an old attempt can move the current schedule

#### Scenario: Solution-viewed not returned on update
- **WHEN** the update response is handled
- **THEN** the UI does not assume `solutionViewed` was returned, and refetches the problem if that flag is needed

#### Scenario: Empty patch blocked
- **WHEN** the edit form is submitted with nothing changed
- **THEN** the request is not sent, since the backend rejects an empty body

### Requirement: Deleting an attempt
The system SHALL allow deleting an attempt behind a confirmation, and SHALL handle the loss of the entire cycle.

#### Scenario: Confirmation
- **WHEN** delete is activated
- **THEN** the confirmation states that the problem's schedule will be replayed without this attempt

#### Scenario: Last attempt removed
- **WHEN** the delete response returns `currentStage: null`
- **THEN** the problem renders the "log your first attempt to start the cycle" empty state, and the timeline is cleared

#### Scenario: Unknown attempt
- **WHEN** the API responds `404`
- **THEN** the UI reports that the attempt no longer exists and refreshes the history

### Requirement: Revalidation after attempt mutations
Every attempt create, update, or delete SHALL revalidate all views derived from the schedule.

#### Scenario: Any attempt mutation
- **WHEN** an attempt is created, updated, or deleted
- **THEN** `/problems/[id]`, `/problems`, `/dashboard`, and `/insights` are revalidated
