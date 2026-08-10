## ADDED Requirements

### Requirement: Server-rendered library listing
The `/problems` route SHALL render from `GET /api/problems` on the server, reading every filter, sort, and page value from `searchParams`.

#### Scenario: Direct navigation with filters in the URL
- **WHEN** the owner opens `/problems?status=DUE,OVERDUE&difficulty=HARD&page=2`
- **THEN** the server issues the equivalent API request and renders the matching page without a client-side fetch

#### Scenario: Shareable state
- **WHEN** the owner changes any filter
- **THEN** the URL updates so the view can be bookmarked, shared, and restored by a back navigation

### Requirement: Filtering
The library SHALL support filtering by practice status, difficulty, topic, source, solution-viewed, and a title search, combined conjunctively as the backend does.

#### Scenario: Multi-value parameters
- **WHEN** two difficulties and two topics are selected
- **THEN** they are sent as comma-separated strings (`difficulty=MEDIUM,HARD`, `topic=array,graph`) and not as repeated parameters

#### Scenario: Topic filter uses slugs
- **WHEN** a topic chip is selected
- **THEN** the request sends the topic `slug` while the chip displays the topic `name`

#### Scenario: Solution-viewed filter
- **WHEN** the solution-viewed filter is set
- **THEN** the request sends the literal string `"true"` or `"false"`

#### Scenario: Status filter excludes unattempted problems
- **WHEN** any status filter is active
- **THEN** the UI states that never-attempted problems are excluded, since the backend omits problems with no revision cycle

#### Scenario: Clearing filters
- **WHEN** the owner clears filters
- **THEN** the corresponding search params are removed from the URL entirely rather than set to empty values

### Requirement: Search
The library SHALL provide a title search that does not cause a full-page navigation on every keystroke.

#### Scenario: Typing a query
- **WHEN** the owner types in the search field
- **THEN** the URL is updated on a debounce and the results section shows a pending state while the server responds

#### Scenario: Search scope communicated
- **WHEN** the search field is rendered
- **THEN** its placeholder or hint states that it matches titles only

### Requirement: Sorting
The library SHALL allow sorting by creation date, title, difficulty, or next due date, in either direction.

#### Scenario: Difficulty sort semantics
- **WHEN** sorting by difficulty
- **THEN** the UI explains that the order is EASY → MEDIUM → HARD → UNRATED, matching the backend's enum order rather than alphabetical

#### Scenario: Sorting by next due date
- **WHEN** sorting by `nextDueAt`
- **THEN** problems with no due date appear last, as the backend orders nulls last

#### Scenario: Default sort
- **WHEN** no sort is specified
- **THEN** the listing is newest-first by creation date

### Requirement: Pagination
The library SHALL paginate using the response `meta` and SHALL keep all other filters intact when the page changes.

#### Scenario: Page navigation
- **WHEN** the owner moves to page 3
- **THEN** only the `page` parameter changes and every other filter is preserved

#### Scenario: Filter change resets paging
- **WHEN** any filter or sort changes
- **THEN** the page resets to 1 so the owner is not stranded on an out-of-range page

#### Scenario: Page count display
- **WHEN** `meta` reports `total` and `totalPages`
- **THEN** the UI states the total result count and the current position within it

### Requirement: Row presentation
Each row SHALL display title, source, difficulty, topics, current stage, next due date, practice state, and attempt count, and SHALL link to the problem detail page.

#### Scenario: Unattempted problem
- **WHEN** a problem has `practiceState: null`
- **THEN** it renders an explicit "not started" treatment rather than a blank cell or a fabricated state

#### Scenario: Practice state is authoritative
- **WHEN** a practice-state badge renders
- **THEN** it uses the server's `practiceState` verbatim and never re-derives it from `nextDueDate`

#### Scenario: Custom problem attribution
- **WHEN** a `CUSTOM` problem has a `sourceName`
- **THEN** that name is shown in place of a LeetCode link

### Requirement: Empty and error states
The library SHALL distinguish an empty library from a filtered result set with no matches, and SHALL surface query errors usefully.

#### Scenario: No problems at all
- **WHEN** the library is empty and no filters are active
- **THEN** an onboarding empty state invites the owner to capture their first problem

#### Scenario: No matches
- **WHEN** filters are active and no results return
- **THEN** the UI says which filters are active and offers to clear them

#### Scenario: Invalid query value
- **WHEN** the API responds `400` because a URL parameter is invalid
- **THEN** the page explains that the filters in the URL are invalid and offers a reset, rather than showing a generic crash

### Requirement: Filter vocabulary source
Topic filter options SHALL come from `GET /api/topics`, most-used first.

#### Scenario: Topic chips
- **WHEN** the filter bar renders topic options
- **THEN** they are ordered by problem count descending and each shows its count
