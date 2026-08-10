## ADDED Requirements

### Requirement: Independently streamed insight cards
The `/insights` route SHALL render its summary, activity, backlog, and weak-topic sections in separate Suspense boundaries so all four requests start in parallel and each card paints as its own data lands.

#### Scenario: One slow endpoint
- **WHEN** the backlog request is slow and the others are fast
- **THEN** the three fast cards render immediately and only the backlog card shows a skeleton

#### Scenario: One failing endpoint
- **WHEN** one insights request fails
- **THEN** only that card shows an error with a retry, and the remaining cards still render

### Requirement: Date range selection
The summary, activity, and backlog sections SHALL accept a shared `from`/`to` range driven by the URL.

#### Scenario: Range in the URL
- **WHEN** the owner selects a range
- **THEN** `from` and `to` are written to `searchParams` as `yyyy-MM-dd` and the page re-renders server-side

#### Scenario: Inverted range
- **WHEN** `from` is later than `to`
- **THEN** the picker prevents it, and a `400` from the API is surfaced as a clear range error rather than a crash

#### Scenario: Range too long
- **WHEN** the selected span exceeds 365 days
- **THEN** the picker prevents selection and explains the limit

#### Scenario: Topic insights ignore the range
- **WHEN** a range is active
- **THEN** the weak-topics card states that topic insights are always all-time, and no range parameters are sent to that endpoint

### Requirement: Summary KPIs
The summary card SHALL present problems added, problems attempted, solved independently, mastered, revision completion, and average solve times.

#### Scenario: Metric windowing explained
- **WHEN** the `mastered` figure renders
- **THEN** it is labelled as a current total rather than a figure for the selected range, matching the backend's definition

#### Scenario: Completion rate present
- **WHEN** `revisionCompletion.rate` is a number
- **THEN** it renders as a percentage alongside its `completedOnTime` / `dueTotal` numerator and denominator

#### Scenario: Completion rate null
- **WHEN** `revisionCompletion.rate` is `null`
- **THEN** an em dash or "No revisions have come due yet" is shown, never `0%`

#### Scenario: Average solve time buckets
- **WHEN** average solve times render
- **THEN** the first-attempt and revision buckets are shown separately with their sample counts, and a `null` average renders as an em dash with a count of 0

#### Scenario: Animated figures
- **WHEN** the summary card enters
- **THEN** its numerals count up to their values, honoring reduced-motion preferences

### Requirement: Activity heatmap
The activity card SHALL render one cell per local date across the returned range.

#### Scenario: Zero-count days
- **WHEN** the response contains days with `count: 0`
- **THEN** those cells render in the empty state, and the client does not fill or infer gaps itself

#### Scenario: Default window
- **WHEN** no range is selected
- **THEN** the trailing 365-day window returned by the API is rendered, using its concrete `range.from` and `range.to`

#### Scenario: Cell detail
- **WHEN** a cell is hovered or focused
- **THEN** its date and attempt count are shown, with the date formatted from the `LocalDate` string without browser-locale date parsing

#### Scenario: Keyboard access
- **WHEN** the heatmap is navigated by keyboard
- **THEN** cells are focusable and their values are exposed to assistive technology

### Requirement: Backlog trend
The backlog card SHALL show the current overdue count and its trend over the range.

#### Scenario: Current versus trend
- **WHEN** the card renders
- **THEN** `overdueCount` is presented as the current total and `trend` as the end-of-day series, with the distinction stated

#### Scenario: Default window
- **WHEN** no range is selected
- **THEN** the trailing 30-day window returned by the API is rendered

#### Scenario: Direction communicated
- **WHEN** the trend is rendered
- **THEN** growing versus shrinking backlog is conveyed by a label or icon, not by color alone

### Requirement: Weak topics
The weak-topics card SHALL rank the weak subset worst-first and explain the rule that produced it.

#### Scenario: Threshold explanation
- **WHEN** the card renders
- **THEN** it states the `minAttempts`, `solveRate`, and `confidence` thresholds returned by the API

#### Scenario: Rate is already a percentage
- **WHEN** `independentSolveRate` renders
- **THEN** it is displayed as-is with a percent sign and is not multiplied by 100

#### Scenario: Under-sampled topic
- **WHEN** a topic has fewer than `minAttempts` attempts
- **THEN** its figures are shown but it is never flagged weak, and the UI notes it is under-sampled

#### Scenario: Null aggregates
- **WHEN** `independentSolveRate`, `averageConfidence`, or `averageMinutes` is `null`
- **THEN** an em dash renders, never `0`

#### Scenario: No weak topics
- **WHEN** `weakTopics` is empty
- **THEN** a positive empty state renders rather than a blank card

### Requirement: Charts use themed tokens
All insight charts SHALL use the shared chart token palette and animate on reveal.

#### Scenario: Palette
- **WHEN** any chart series renders
- **THEN** it uses `--chart-*` tokens through the chart library's variable helpers rather than literal colors

#### Scenario: Re-animation on range change
- **WHEN** a new range's data arrives
- **THEN** the affected charts replay their reveal animation

#### Scenario: Legible in both themes
- **WHEN** the theme is toggled
- **THEN** axes, gridlines, tooltips, and series remain legible with sufficient contrast
