## ADDED Requirements

### Requirement: Update header layout
The header MUST replace its `bg-background/80 backdrop-blur` and subtle `border-b border-border` with a fully opaque solid background and `border-b-2 border-foreground`. The header MUST NOT use any blur effects.

#### Scenario: Scrolling the page under the header
- **WHEN** the page content scrolls beneath the header
- **THEN** the header remains fully opaque with a 2px solid bottom border and no blur effect

### Requirement: Restyle navigation links
Active navigation links MUST use solid box outlines or inverted fill tabs with thick 2px borders, replacing the current subtle opacity or color-shift indicators.

#### Scenario: Selecting a navigation link
- **WHEN** a navigation item becomes active
- **THEN** it displays a bold inverted fill or solid box outline with thick borders

#### Scenario: Hovering a navigation link
- **WHEN** a user hovers over an inactive navigation link
- **THEN** a visible border or background change indicates interactivity

### Requirement: Update mobile nav drawer
The mobile navigation drawer MUST render as a thick-bordered panel with bold 2px structural separation between items.

#### Scenario: Opening the mobile menu
- **WHEN** the mobile nav drawer opens
- **THEN** items are visually separated by thick 2px lines inside a heavily bordered panel

### Requirement: Restyle login page container
The login page MUST use a neo-brutal container card with 2px borders, sharp corners, and a hard shadow offset (`--shadow-neo-lg`). The centered layout MUST be preserved.

#### Scenario: Viewing the login form
- **WHEN** the login page loads
- **THEN** the form is housed in a sharp-cornered, thick-bordered card with a large hard shadow, centered on the page

### Requirement: Structure page sections with visual hierarchy
Cards and stat boxes on the dashboard MUST use hard shadows and thick borders. Visual hierarchy MUST be established through border weight and shadow offset size — primary content uses larger shadows (`--shadow-neo-lg`), secondary content uses smaller shadows (`--shadow-neo-sm`).

#### Scenario: Viewing dashboard statistics
- **WHEN** a user views the dashboard
- **THEN** primary stat boxes use larger shadow offsets than secondary content cards, creating clear visual hierarchy

### Requirement: Restyle reminder banners
Reminder banners MUST display with 2px borders and high-contrast fills that command attention.

#### Scenario: Viewing a system reminder
- **WHEN** a reminder banner is present on the page
- **THEN** it displays with thick borders and a punchy high-contrast fill color

### Requirement: Preserve application structure
All layout changes MUST maintain existing responsive behavior, Server Component boundaries, Suspense boundary structures, and client leaf isolation patterns.

#### Scenario: Resizing the browser window
- **WHEN** the viewport size changes
- **THEN** the layout adapts responsively without breaking component boundaries or Suspense regions

#### Scenario: Streaming server components
- **WHEN** a page with independent Suspense boundaries loads
- **THEN** each section streams and paints independently, identical to pre-reskin behavior
