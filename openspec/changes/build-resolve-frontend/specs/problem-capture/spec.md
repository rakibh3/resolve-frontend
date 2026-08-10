## ADDED Requirements

### Requirement: Two capture modes
The capture flow SHALL offer a LeetCode-URL mode and a custom-problem mode, sending the correct discriminated body for each.

#### Scenario: LeetCode capture
- **WHEN** the owner captures by URL
- **THEN** the request body carries `source: "LEETCODE"` with the `url`

#### Scenario: Custom capture
- **WHEN** the owner captures a custom problem
- **THEN** the request body carries `source: "CUSTOM"` with a `title`, and difficulty defaults to `UNRATED` when unset

### Requirement: Preview before capture
The LeetCode flow SHALL call `POST /api/problems/preview` and show the resolved title, difficulty, and topics for confirmation before creating anything.

#### Scenario: Metadata resolved
- **WHEN** the preview returns metadata with `existingProblemId: null`
- **THEN** the resolved title, difficulty, and topics are shown for confirmation, editable before submission

#### Scenario: URL forms accepted
- **WHEN** the owner pastes a URL with a query string, a `/description` or `/solutions` suffix, or a `www.` host
- **THEN** the preview succeeds and the confirmed canonical URL is displayed

#### Scenario: Not a LeetCode problem URL
- **WHEN** the preview responds `400`
- **THEN** an inline field error is shown on the URL input and nothing is created

### Requirement: Duplicate detection at preview
When the previewed URL is already in the library, the flow SHALL offer to open the existing problem rather than capture again.

#### Scenario: Already captured
- **WHEN** the preview returns a non-null `existingProblemId`
- **THEN** the UI states the problem is already in the library and offers a direct link to it as the primary action

### Requirement: Manual metadata fallback
When metadata cannot be resolved, the flow SHALL switch to manual entry pre-filled with the echoed canonical URL.

#### Scenario: Resolution fails
- **WHEN** preview or capture responds `422`
- **THEN** the form switches to manual mode, pre-fills the URL from `errorDetails.canonicalUrl`, and requires title and difficulty

#### Scenario: Manual LeetCode difficulty constraint
- **WHEN** the owner enters manual metadata for a LeetCode problem
- **THEN** `UNRATED` is not offered, because the backend rejects it for LeetCode problems

#### Scenario: Title and difficulty are paired
- **WHEN** a title is supplied in manual mode
- **THEN** a difficulty is required, since supplying one without the other responds `422`

### Requirement: Duplicate handling at capture
The flow SHALL treat a `200` response with `alreadyExisted: true` as a successful non-creation.

#### Scenario: Duplicate URL captured
- **WHEN** the capture responds `200` with `alreadyExisted: true`
- **THEN** the owner is routed to the existing problem and told it was already in the library, and no "created" confirmation is shown

#### Scenario: New problem created
- **WHEN** the capture responds `201`
- **THEN** the owner is routed to the new problem with a creation confirmation

### Requirement: Custom problem fields
The custom mode SHALL accept title, difficulty, topics, source name, source URL, and statement, enforcing the backend's limits client-side as well.

#### Scenario: Field limits
- **WHEN** the owner types a title over 300 characters, a source name over 200, or a statement over 20,000
- **THEN** the form indicates the limit before submission

#### Scenario: Source URL validity
- **WHEN** a source URL is entered that is not an absolute http(s) URL
- **THEN** an inline error is shown and submission is blocked

#### Scenario: Only title required
- **WHEN** the owner submits with only a title
- **THEN** the capture succeeds and the problem is created with `UNRATED` difficulty

### Requirement: Topic entry
The capture form SHALL let the owner add topics as free text with suggestions from the existing vocabulary.

#### Scenario: Suggestions offered
- **WHEN** the owner types into the topics field
- **THEN** matching existing topics are suggested from `GET /api/topics`

#### Scenario: Normalization explained
- **WHEN** the owner enters a topic that differs only in case or spacing from an existing one
- **THEN** the UI indicates it will resolve to the existing topic, since the backend normalizes to a slug

#### Scenario: Topic length limit
- **WHEN** a topic name exceeds 60 characters
- **THEN** it is rejected before submission

### Requirement: New problems have no cycle
The capture confirmation SHALL make clear that a captured problem is not yet scheduled.

#### Scenario: After capture
- **WHEN** a newly created problem is shown
- **THEN** its practice state renders as not started and the UI prompts the owner to log the first attempt to begin the revision cycle

### Requirement: Post-capture revalidation
Capturing SHALL revalidate every view its result can change.

#### Scenario: Successful creation
- **WHEN** a problem is created
- **THEN** `/problems`, `/topics`, and `/insights` are revalidated
