## ADDED Requirements

### Requirement: Reminder banner
The authenticated shell SHALL render a server-side reminder banner from `GET /api/reminders/current`.

#### Scenario: Banner shown
- **WHEN** the reminder state is `active: true` and `acknowledged: false`
- **THEN** the banner renders with the API's `notification.title` and `notification.body`

#### Scenario: Banner hidden
- **WHEN** the reminder is inactive or already acknowledged
- **THEN** no banner renders

#### Scenario: Copy comes from the server
- **WHEN** the banner or any notification renders
- **THEN** it uses the API's pre-rendered copy verbatim and does not invent its own wording

#### Scenario: Target path mapped
- **WHEN** the banner links to the reminder's target
- **THEN** the API's `targetPath` is mapped onto this application's dashboard route

#### Scenario: Announced politely
- **WHEN** the banner appears
- **THEN** it is exposed as a polite live region so it does not interrupt assistive technology mid-sentence

### Requirement: Acknowledgement
The banner SHALL offer a dismiss action calling `POST /api/reminders/acknowledge`.

#### Scenario: Dismissing
- **WHEN** the owner dismisses the reminder
- **THEN** the acknowledge request is sent, the layout is revalidated, and the banner disappears

#### Scenario: Pending state
- **WHEN** the acknowledge request is in flight
- **THEN** the dismiss control is disabled and shows a pending label

#### Scenario: Acknowledgement resets daily
- **WHEN** the owner's local date rolls over
- **THEN** the banner can appear again without any client-side reset, since acknowledgement is stored as a local date

#### Scenario: Harmless acknowledgement
- **WHEN** acknowledge is called while nothing is active
- **THEN** the `200` response is handled without an error being surfaced

### Requirement: Refresh cadence
The reminder state SHALL be refreshed on a minutes-scale interval and on tab visibility, never on a seconds-scale poll.

#### Scenario: Interval refresh
- **WHEN** the app stays open past the reminder time
- **THEN** the reminder state is refreshed on an interval of at least several minutes so the banner can appear without a navigation

#### Scenario: Tab refocus
- **WHEN** the tab becomes visible again
- **THEN** the reminder state is refreshed once

#### Scenario: Cleanup
- **WHEN** the refreshing component unmounts
- **THEN** its interval and visibility listener are removed

#### Scenario: Write amplification avoided
- **WHEN** the refresh cadence is chosen
- **THEN** it accounts for every authenticated request writing `lastActiveAt` on the user row

### Requirement: Browser notification
The system SHALL optionally raise a browser notification using the API's copy, only with explicit permission.

#### Scenario: Permission request
- **WHEN** the owner opts into browser notifications
- **THEN** permission is requested from a user gesture in a Client Component, never automatically on load

#### Scenario: Notification content
- **WHEN** a notification is raised
- **THEN** it uses the API's `notification.title` and `notification.body`, and activating it navigates to the mapped target path

#### Scenario: Permission denied or unsupported
- **WHEN** permission is denied or the Notification API is unavailable
- **THEN** the in-app banner remains the sole channel and no error is surfaced

#### Scenario: Not repeated within a day
- **WHEN** a notification has been raised for the current local date
- **THEN** it is not raised again for that date

### Requirement: Reminder counts
The banner SHALL be able to show the due-tomorrow, due-today, and overdue counts from the reminder state.

#### Scenario: Counts displayed
- **WHEN** the reminder state carries `dueTomorrow`, `dueToday`, and `overdueToday`
- **THEN** they are rendered as returned, with no client-side recomputation from the problem list
