## ADDED Requirements

### Requirement: Dark mode by default
The application SHALL render in dark mode for a visitor with no stored preference.

#### Scenario: First visit
- **WHEN** a visitor loads the app with no theme stored
- **THEN** the dark palette is applied and the toggler reports "Dark" as the active theme

#### Scenario: Stored preference wins
- **WHEN** the visitor has previously selected light
- **THEN** the light palette is applied on the next load and persists across navigations and reloads

### Requirement: Theme toggler
The application shell SHALL expose a theme toggler offering light, dark, and system options.

#### Scenario: Switching theme
- **WHEN** the owner selects a different option from the toggler
- **THEN** the palette changes immediately without a page reload and the choice is persisted

#### Scenario: System option
- **WHEN** the owner selects "System"
- **THEN** the palette follows the OS `prefers-color-scheme` setting and updates live when the OS setting changes

#### Scenario: Accessible control
- **WHEN** the toggler is rendered
- **THEN** it is reachable by keyboard, exposes an accessible name, and communicates the currently active theme to assistive technology

### Requirement: No flash of incorrect theme
The theme SHALL be applied before first paint so no light-then-dark flash occurs.

#### Scenario: Hard reload in dark mode
- **WHEN** the owner reloads any page with dark active
- **THEN** the first painted frame is already dark

#### Scenario: Hydration safety
- **WHEN** the root layout renders
- **THEN** `<html>` carries `suppressHydrationWarning` and no hydration mismatch is logged for the theme attribute

### Requirement: Both palettes are first-class
Every surface, chart, badge, and state color SHALL be defined by CSS custom properties for both light and dark, extending the existing shadcn `base-nova` token set in `app/globals.css` rather than replacing it.

#### Scenario: No hard-coded colors
- **WHEN** a component needs a color
- **THEN** it references a semantic token (`bg-card`, `text-muted-foreground`, `--chart-1`, and so on) and never a literal hex or named color

#### Scenario: Practice-state colors
- **WHEN** `OVERDUE`, `DUE`, `SCHEDULED`, `MASTERED`, and `NEEDS_REINFORCEMENT` badges render
- **THEN** each has a dedicated token pair that meets WCAG AA contrast against its surface in both light and dark

#### Scenario: Chart tooltip surfaces
- **WHEN** a chart tooltip renders
- **THEN** it uses `bg-popover text-popover-foreground` so it is legible in both palettes

### Requirement: Difficulty and state color semantics are consistent
Difficulty and practice-state colors SHALL be defined once as tokens and reused everywhere those values appear.

#### Scenario: Same difficulty across views
- **WHEN** `MEDIUM` appears on the dashboard, in the library table, and on the problem detail page
- **THEN** all three render the identical token-driven color treatment

#### Scenario: Color is never the only signal
- **WHEN** a state or difficulty is conveyed
- **THEN** a text label or icon accompanies the color so the meaning survives for color-blind users
