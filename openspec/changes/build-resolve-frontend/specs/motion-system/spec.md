## ADDED Requirements

### Requirement: Shared motion tokens
The system SHALL define motion as CSS custom properties — durations, easings, and stagger steps — and every animation SHALL consume them rather than declaring ad-hoc values.

#### Scenario: Consistent timing
- **WHEN** two different components animate an entrance
- **THEN** both reference the same duration and easing tokens, producing a coherent feel

#### Scenario: Token scale
- **WHEN** motion tokens are defined
- **THEN** they cover at least a fast (~150ms), base (~250ms), slow (~400ms), and reveal (~1100ms, matching the chart enter convention) tier

### Requirement: Reduced motion is honored everywhere
Every animation SHALL be disabled or reduced to a near-instant opacity change when the user prefers reduced motion.

#### Scenario: Reduced-motion user loads the dashboard
- **WHEN** `prefers-reduced-motion: reduce` is set
- **THEN** counters render their final values immediately, cards appear without transform, charts render fully drawn, and no looping or parallax motion runs

#### Scenario: No information conveyed by motion alone
- **WHEN** an animation communicates state
- **THEN** the same state is also readable from static text or an icon

### Requirement: Staggered entrance for grouped content
Grids and lists of cards SHALL animate in with a bounded stagger so the dashboard reads as composed rather than as a single pop.

#### Scenario: Dashboard cards enter
- **WHEN** the dashboard's Suspense boundary resolves
- **THEN** its cards fade and rise into place in sequence with a per-item delay capped so the last item is not visibly late

#### Scenario: Long list
- **WHEN** a list has many items
- **THEN** the stagger applies only to items in the initial viewport and later items appear without delay

### Requirement: Animated numerals
Headline metrics SHALL count up to their value on first appearance.

#### Scenario: Due count appears
- **WHEN** the dashboard's due count of 7 first renders
- **THEN** the numeral animates from 0 to 7 and settles on the exact value

#### Scenario: Value changes after revalidation
- **WHEN** a revalidation changes a metric from 7 to 5
- **THEN** the numeral animates from 7 to 5 rather than restarting from 0

#### Scenario: Layout stability
- **WHEN** a numeral animates through values of differing digit widths
- **THEN** tabular figures keep the surrounding layout from shifting

#### Scenario: Screen reader output
- **WHEN** a counting numeral is announced
- **THEN** assistive technology receives the final value once, not every intermediate frame

### Requirement: Streak and progress meters
The streak and any completion-rate figure SHALL be presented as an animated radial or linear meter that fills on entrance.

#### Scenario: Streak meter
- **WHEN** the streak card renders
- **THEN** the ring animates from empty to its proportion using the reveal duration token

#### Scenario: Null rate
- **WHEN** a rate is `null`
- **THEN** the meter renders in an explicit empty state with an em dash and no fill animation

### Requirement: Chart reveal animation
Charts SHALL animate on first reveal using the Bklit chart animation conventions, and SHALL be replayable by changing the reveal signature.

#### Scenario: Lookahead chart enters
- **WHEN** the 7-day lookahead chart first renders
- **THEN** its bars grow from the baseline over the reveal duration

#### Scenario: Range change replays
- **WHEN** the insights range changes and new data arrives
- **THEN** the chart re-animates by receiving a new reveal signature or key rather than snapping

### Requirement: Skeleton to content transition
Suspense fallbacks SHALL crossfade into their resolved content rather than swapping abruptly.

#### Scenario: Streamed section resolves
- **WHEN** a Suspense boundary's data arrives
- **THEN** the skeleton fades out as the content fades in, with the skeleton occupying the same footprint so no layout shift occurs

### Requirement: Route and state transitions
Navigations between routes and changes to filtered result sets SHALL be visually continuous.

#### Scenario: Navigating to problem detail
- **WHEN** the owner opens a problem from the library
- **THEN** the transition is animated where the browser supports view transitions, and degrades to an instant navigation where it does not

#### Scenario: Filter applied
- **WHEN** a library filter changes the result set
- **THEN** the outgoing rows fade out and the incoming rows fade in, with a pending indicator during the server round trip

### Requirement: Interaction feedback
Interactive surfaces SHALL provide motion feedback on hover, press, and focus that never obscures the focus ring.

#### Scenario: Card hover
- **WHEN** a pointer hovers a due-problem card
- **THEN** the card lifts subtly and its affordances become visible

#### Scenario: Keyboard focus
- **WHEN** the same card receives keyboard focus
- **THEN** the focus ring is fully visible and is not clipped or overlapped by any transform

### Requirement: Animation performance
Animations SHALL be restricted to compositor-friendly properties.

#### Scenario: Property choice
- **WHEN** any entrance, hover, or transition animation is authored
- **THEN** it animates `transform` and `opacity`, not `width`, `height`, `top`, or `left`

#### Scenario: Server Component boundary
- **WHEN** an animated component requires client-side state
- **THEN** only the animated leaf is a Client Component, and its data-fetching parent remains a Server Component
