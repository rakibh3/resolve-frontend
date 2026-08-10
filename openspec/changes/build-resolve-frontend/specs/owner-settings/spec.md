## ADDED Requirements

### Requirement: Settings page
The `/settings` route SHALL render the owner's settings from `GET /api/settings` and allow editing timezone, notification enablement, and reminder time.

#### Scenario: First read creates defaults
- **WHEN** settings have never been written
- **THEN** the page still renders, showing the lazily created defaults of `UTC`, notifications disabled, and `20:00`

#### Scenario: Partial update
- **WHEN** the owner changes only one field
- **THEN** only changed fields are sent, and the request is never an empty body

### Requirement: Timezone selection
The timezone control SHALL accept only valid IANA identifiers and SHALL treat the stored value as authoritative.

#### Scenario: Picker options
- **WHEN** the timezone control renders
- **THEN** its options come from `Intl.supportedValuesOf('timeZone')`

#### Scenario: Browser timezone is only a suggestion
- **WHEN** the stored timezone differs from the browser's
- **THEN** the stored value is what is selected, and the browser's zone may be offered as a suggestion but never substituted

#### Scenario: Invalid timezone rejected
- **WHEN** the API responds `400` for an invalid identifier
- **THEN** the message is shown against the timezone field

### Requirement: Timezone change invalidates everything
Changing the timezone SHALL revalidate the entire application because every derived date moves.

#### Scenario: Timezone saved
- **WHEN** a timezone change succeeds
- **THEN** `revalidatePath('/', 'layout')` is called and the owner is told that due dates, streaks, and activity buckets have been re-derived

### Requirement: Reminder time format
The reminder time SHALL be submitted as a zero-padded 24-hour `HH:mm` string.

#### Scenario: Zero padding
- **WHEN** the owner sets 8am
- **THEN** `"08:00"` is sent, not `"8:00"`

#### Scenario: Invalid hour
- **WHEN** a value such as `"24:00"` would be produced
- **THEN** the control prevents it

### Requirement: Notification toggle
The notification toggle SHALL be sent as a JSON boolean.

#### Scenario: Toggling on
- **WHEN** the owner enables notifications
- **THEN** `notificationsEnabled: true` is sent as a boolean, not the string `"on"`

#### Scenario: Effect explained
- **WHEN** notifications are enabled
- **THEN** the UI explains that reminders only appear while the app is open, since there is no server-side push

### Requirement: Acknowledgement date is read-only
The settings form SHALL NOT attempt to write `lastAcknowledgedDate`.

#### Scenario: Field presentation
- **WHEN** the last acknowledged date is shown
- **THEN** it is displayed as read-only information owned by the reminder acknowledge endpoint

### Requirement: Profile editing
The system SHALL allow editing the owner's name, email, avatar URL, and bio via `PUT /api/users/my-profile`.

#### Scenario: Correct method
- **WHEN** the profile is saved
- **THEN** the request uses `PUT`, not `PATCH`, even though the semantics are partial

#### Scenario: Empty values omitted
- **WHEN** an optional field is left blank
- **THEN** it is omitted from the body rather than sent as an empty string

#### Scenario: Field validation
- **WHEN** a name shorter than 2 or longer than 100 characters, an invalid email, an invalid photo URL, or a bio over 500 characters is entered
- **THEN** an inline error is shown before submission

#### Scenario: Duplicate email
- **WHEN** the API responds `400` for a taken email
- **THEN** the message is shown against the email field

#### Scenario: Missing profile row
- **WHEN** the API responds `404` because no profile row exists for the owner
- **THEN** a specific, actionable message explains that the profile record is missing, rather than rendering a generic not-found page

#### Scenario: Header reflects the change
- **WHEN** a profile update succeeds
- **THEN** `revalidatePath('/', 'layout')` is called so the shell's name and avatar update
