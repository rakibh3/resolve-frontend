## ADDED Requirements

### Requirement: Topic listing
The `/topics` route SHALL render the vocabulary from `GET /api/topics` with each topic's problem count, in the server's order.

#### Scenario: Ordering preserved
- **WHEN** the topic list renders
- **THEN** topics appear most-used first as returned by the API, without client-side re-sorting

#### Scenario: Unused topics
- **WHEN** a topic has a problem count of 0
- **THEN** it renders with an explicit zero and is visually distinguished as unused

#### Scenario: Used-only filter
- **WHEN** the owner filters to used topics only
- **THEN** the request sends the literal string `usedOnly=true`

#### Scenario: Empty vocabulary
- **WHEN** no topics exist
- **THEN** an empty state explains that topics are created automatically when a problem is tagged, and that there is no way to create one directly

### Requirement: Navigating from a topic to its problems
Each topic SHALL link to the library filtered by that topic.

#### Scenario: Topic followed
- **WHEN** the owner opens a topic
- **THEN** they land on `/problems?topic=<slug>` using the topic's slug, not its display name

### Requirement: Renaming a topic
The system SHALL allow renaming a topic via `PATCH /api/topics/:id`.

#### Scenario: Simple rename
- **WHEN** the new name does not normalize to an existing topic's slug
- **THEN** the topic is renamed in place and the list reflects the new name and slug

#### Scenario: Name validation
- **WHEN** an empty, whitespace-only, over-length, or non-alphanumeric name such as `"!!!"` is submitted
- **THEN** the form blocks it or surfaces the backend's `400` message against the field

### Requirement: Merge warning and detection
Because a rename can merge and destroy a topic, the UI SHALL warn before submitting and SHALL detect that a merge occurred afterwards.

#### Scenario: Collision warning
- **WHEN** the entered name normalizes to the slug of a different existing topic
- **THEN** the UI warns that this will merge the two topics before the owner confirms

#### Scenario: Merge detected
- **WHEN** the response's `id` differs from the id that was sent
- **THEN** the UI reports that the topics were merged and names the surviving topic

#### Scenario: List reconciled after a merge
- **WHEN** a merge completes
- **THEN** the renamed topic is removed from the list and the surviving topic's problem count reflects the moved links

### Requirement: Revalidation after a rename
Renaming SHALL revalidate every view that displays topic names or filters by topic.

#### Scenario: Successful rename
- **WHEN** a rename or merge succeeds
- **THEN** `/topics`, `/problems`, and `/insights` are revalidated

#### Scenario: Stale topic filter
- **WHEN** a merged-away slug is still present in a saved library URL
- **THEN** the library renders an empty result with an option to clear the filter, rather than failing
