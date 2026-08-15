## ADDED Requirements

### Requirement: Restyle button components
Button components MUST use a 2px foreground border, zero border-radius, hard shadow (`--shadow-neo-sm`), and press-down active state (translate + shadow removal). All button variants (default, secondary, outline, ghost, destructive, link) MUST be adapted to the neo-brutalist style.

#### Scenario: Rendering a default button
- **WHEN** a default button renders
- **THEN** it displays with a 2px solid foreground border, sharp corners, and a hard offset shadow

#### Scenario: Pressing a button
- **WHEN** a user clicks/presses a button
- **THEN** the button translates 2px down-right and its shadow disappears

### Requirement: Restyle card components
Card components MUST use a 2px foreground border, zero border-radius, and hard shadow offset (`--shadow-neo`), replacing any `ring-1 ring-foreground/10` utilities.

#### Scenario: Viewing a standard card
- **WHEN** a card is rendered on screen
- **THEN** it displays with sharp corners, 2px solid borders, and a hard offset shadow

### Requirement: Restyle badge components
Badge components MUST use a 2px foreground border, rectangular shape (no `rounded-full` or `rounded-4xl`), bold uppercase text, and high-contrast semantic fills.

#### Scenario: Displaying a status badge
- **WHEN** a badge component renders with a semantic variant
- **THEN** it appears as a sharp rectangle with uppercase bold text, thick borders, and a high-contrast fill

### Requirement: Restyle form inputs
Input, Textarea, and Select components MUST use 2px foreground borders, sharp corners, hard shadow (`--shadow-neo-sm`), and crisp `outline-2 outline-foreground outline-offset-2` on focus-visible.

#### Scenario: Rendering an input field
- **WHEN** an input field renders
- **THEN** it displays with sharp corners, 2px solid borders, and a small hard shadow

#### Scenario: Focusing an input field
- **WHEN** an input field receives keyboard focus
- **THEN** it displays a crisp 2px offset outline instead of a soft shadow ring

### Requirement: Restyle overlay components
Dialog, Sheet, and Popover components MUST use 2px foreground borders, hard shadow offset, sharp corners, and a stark backdrop overlay.

#### Scenario: Opening a dialog
- **WHEN** a dialog overlay appears
- **THEN** the modal container uses thick borders, hard shadows, and sharp corners against a stark backdrop

### Requirement: Restyle tabs components
Tab trigger buttons MUST be blocky with sharp corners and thick borders. The active tab MUST use an inverted fill (foreground background with background foreground text) with a thick border.

#### Scenario: Viewing active tab
- **WHEN** a tab is active
- **THEN** it displays with an inverted color fill, thick solid border, and sharp corners

#### Scenario: Viewing inactive tab
- **WHEN** a tab is inactive
- **THEN** it displays as a blocky bordered button without the inverted fill

### Requirement: Restyle table components
Tables MUST use bold 2px grid lines (`border-2 border-foreground`) and high-contrast header cells with a distinct background fill.

#### Scenario: Viewing a data table
- **WHEN** a table renders
- **THEN** header cells are high-contrast with bold separating lines throughout the grid

### Requirement: Restyle checkbox and switch
Checkbox components MUST render as rectangular chunky boxes with sharp corners and a 2px border. Switch components MUST retain `rounded-full` as a functional affordance exception but use a thick border.

#### Scenario: Viewing a checkbox
- **WHEN** a checkbox renders
- **THEN** it appears as a sharp-cornered rectangle with a 2px border

#### Scenario: Toggling a switch
- **WHEN** a switch is toggled
- **THEN** the thumb moves across a track that retains rounded shape but uses a thick border

### Requirement: Restyle toast notifications
Sonner toast notifications MUST use neo-brutal card framing with 2px borders, sharp corners, and hard shadow.

#### Scenario: Showing a toast message
- **WHEN** a notification toast triggers
- **THEN** it appears as a blocky card with thick borders and a hard offset shadow

### Requirement: Adapt domain components
PracticeStateBadge, DifficultyBadge, TopicChips, PatternChips, RecallBadge, and StageLabel MUST adopt thick 2px borders and high-contrast fills. TopicChips MUST keep outline styling but with 2px borders and sharp corners. PatternChips MUST keep accent fill and `#` prefix but with sharp corners and 2px borders.

#### Scenario: Rendering topic chips
- **WHEN** topic chips are displayed
- **THEN** they render as sharp-cornered outline badges with 2px borders

#### Scenario: Rendering pattern chips
- **WHEN** pattern chips are displayed
- **THEN** they render with a `#` prefix, accent fill, sharp corners, and 2px borders

#### Scenario: Rendering practice state badge
- **WHEN** a practice state badge renders
- **THEN** it displays as a rectangular high-contrast tag with thick borders instead of a soft pill

### Requirement: Preserve Base UI accessibility primitives
All component restyling MUST be limited to className and CSS changes. No `@base-ui/react` imports, component structure, prop interfaces, or accessibility behaviors SHALL be modified.

#### Scenario: Keyboard navigating an updated component
- **WHEN** a user keyboard-navigates any restyled component
- **THEN** focus management, ARIA attributes, and announcements behave identically to the pre-restyled version

#### Scenario: Screen reader interaction
- **WHEN** a screen reader interacts with a restyled component
- **THEN** the component announces and behaves identically to its previous version
