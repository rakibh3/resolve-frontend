## ADDED Requirements

### Requirement: Today screen data source
The `/dashboard` route SHALL render from a single `GET /api/dashboard/today` request and SHALL NOT recompute any of its figures client-side.

#### Scenario: Rendering the dashboard
- **WHEN** the dashboard loads
- **THEN** counts, due list, recommended slice, streak, and lookahead all come from that one response

#### Scenario: Parallel companion request
- **WHEN** the dashboard also needs the reminder state
- **THEN** both requests are issued in parallel, never sequentially

### Requirement: Streamed shell
The dashboard SHALL render its heading and layout immediately and stream data sections inside Suspense boundaries.

#### Scenario: Slow API
- **WHEN** the dashboard request is slow
- **THEN** the page heading paints immediately and each data section shows a shaped skeleton until it resolves

### Requirement: Due and overdue counters
The dashboard SHALL display the due-today and overdue counts as distinct, animated headline figures.

#### Scenario: Both counts present
- **WHEN** `dueCount` is 3 and `overdueCount` is 2
- **THEN** both are shown as separately labelled figures, with the overdue figure visually emphasized as the more urgent

#### Scenario: Nothing due
- **WHEN** both counts are 0
- **THEN** an explicit "You're all caught up" empty state is shown with a link to the library, not a zeroed-out card grid

### Requirement: Recommended queue
The dashboard SHALL present `recommended` as a suggested workload of at most five problems, clearly marked as a slice of the full due list.

#### Scenario: More due than recommended
- **WHEN** `due` has 12 entries and `recommended` has 5
- **THEN** the UI shows the five and states that 12 are due in total, offering a control to reveal the rest

#### Scenario: No double counting
- **WHEN** both `recommended` and `due` are rendered
- **THEN** the recommended items are not presented as a separate set in addition to the due items

### Requirement: Due list presentation
Each due entry SHALL show its title, source, difficulty, topics, current stage, due date, and overdue magnitude, and SHALL link to the problem detail page.

#### Scenario: Overdue item
- **WHEN** an item has `daysOverdue` of 2
- **THEN** it is labelled as 2 days overdue using the backend value, with an overdue-state badge

#### Scenario: Due today
- **WHEN** an item has `daysOverdue` of 0
- **THEN** it is labelled as due today

#### Scenario: Ordering preserved
- **WHEN** the due list renders
- **THEN** it preserves the server's order — most overdue first — and does not re-sort

#### Scenario: Solution previously viewed
- **WHEN** an item has `solutionViewed: true`
- **THEN** an indicator marks it so the owner knows the cycle was reset at some point

### Requirement: Quick attempt logging from the dashboard
The dashboard SHALL allow logging an attempt for a due problem without navigating away.

#### Scenario: Logging inline
- **WHEN** the owner logs an attempt from a due card
- **THEN** the attempt is submitted via the attempt Server Action and the dashboard revalidates so counters, streak, and the due list update

#### Scenario: Item leaves the list
- **WHEN** a logged attempt moves the problem's next due date into the future
- **THEN** the item animates out of the due list and the counters animate to their new values

### Requirement: Streak display
The dashboard SHALL display the current practice streak as an animated meter with its exact numeric value.

#### Scenario: Active streak
- **WHEN** `streak` is 12
- **THEN** the meter animates in and the figure reads 12 days

#### Scenario: Zero streak
- **WHEN** `streak` is 0
- **THEN** an encouraging empty state is shown rather than an empty meter with no explanation

### Requirement: Seven-day lookahead
The dashboard SHALL chart the seven `upcoming` entries starting tomorrow, including zero-count days.

#### Scenario: Sparse week
- **WHEN** several upcoming days have `count: 0`
- **THEN** those days are still plotted at zero so the week reads as contiguous

#### Scenario: Day labels
- **WHEN** the lookahead renders its axis
- **THEN** each `LocalDate` is labelled without passing through browser-locale parsing of the raw string

#### Scenario: Overdue excluded
- **WHEN** the lookahead renders
- **THEN** it contains only future days and never folds overdue work into the first bar

### Requirement: Freshness across the local midnight boundary
The dashboard SHALL refresh itself rather than displaying badges that silently go stale at the owner's local midnight.

#### Scenario: Tab left open overnight
- **WHEN** the dashboard has been open across the owner's local midnight and the tab becomes visible again
- **THEN** the page refreshes so due and overdue classifications are recomputed by the server

#### Scenario: Polling cadence
- **WHEN** the dashboard refreshes on an interval
- **THEN** the interval is measured in minutes, never seconds, because every authenticated request writes `lastActiveAt`

### Requirement: Timezone attribution
The dashboard SHALL make the owner's operative timezone discoverable.

#### Scenario: Timezone shown
- **WHEN** the dashboard renders its date
- **THEN** the `date` and `timezone` from the response are used, with the timezone surfaced or linked to settings
