## ADDED Requirements

### Requirement: Update border radius tokens
The design token system MUST define `--radius` as `0px` in `globals.css` and derived radii MUST be bounded between `0px` and `4px` maximum to create sharp, blocky UI elements.

#### Scenario: Applying border radius to a card
- **WHEN** a component uses the `--radius-lg` or similar token
- **THEN** it renders with sharp or minimally rounded corners (max 4px)

### Requirement: Define neo-brutalist shadow tokens
The system MUST introduce `--shadow-neo-sm`, `--shadow-neo`, and `--shadow-neo-lg` tokens with hard offsets, zero blur, and solid colors using `currentColor` or the foreground token. Variants MUST include small (2px 2px 0px 0px), medium (3px 3px 0px 0px), and large (5px 5px 0px 0px).

#### Scenario: Elevating an element with a small shadow
- **WHEN** the `--shadow-neo-sm` token is applied to an element
- **THEN** the element displays a 2px horizontal and 2px vertical hard offset shadow with no blur

#### Scenario: Elevating an element with a large shadow
- **WHEN** the `--shadow-neo-lg` token is applied to an element
- **THEN** the element displays a 5px horizontal and 5px vertical hard offset shadow with no blur

### Requirement: Thicken border tokens
Default border width tokens MUST be thickened from 1px to 2px solid and MUST map to the foreground color. Ring-based edges (`ring-1 ring-foreground/10`) MUST be replaced by solid 2px borders.

#### Scenario: Rendering a bordered container
- **WHEN** a default border utility is used on a container
- **THEN** it displays as a 2px solid border using the foreground color instead of a 1px ring

### Requirement: Shift color palette to high-chroma
Semantic state tokens (`--state-due`, `--state-overdue`, `--state-mastered`, `--state-reinforcement`, `--state-scheduled`) MUST shift to higher saturation and chroma while maintaining WCAG AA contrast ratios against their foreground. The base palette (background, foreground, card, muted) MUST remain achromatic (black/white/neutral grays). Primary/accent MUST use a bold high-chroma accent color.

#### Scenario: Viewing a practice state badge in light mode
- **WHEN** a semantic state color is rendered in light mode
- **THEN** the badge uses a punchy, highly saturated fill color that passes WCAG AA against its foreground text

#### Scenario: Viewing a practice state badge in dark mode
- **WHEN** a semantic state color is rendered in dark mode
- **THEN** the badge uses a high-chroma fill tuned for dark surfaces that passes WCAG AA against its foreground text

### Requirement: Update focus ring style
The focus indication MUST change from `focus-visible:ring-3 ring-ring/50` to a crisp `focus-visible:outline-2 outline-foreground outline-offset-2`.

#### Scenario: Focusing an interactive element via keyboard
- **WHEN** a user focuses an input or button via keyboard navigation
- **THEN** it displays a sharp 2px solid outline separated from the element by a 2px gap

### Requirement: Implement press-down interactive utility
The `.interactive-lift` class MUST be replaced with `.interactive-press`. The press utility MUST translate the element by 2px on both axes and remove its hard shadow on the `:active` state. The transition MUST use compositor-friendly properties only (`transform` and `box-shadow`).

#### Scenario: Pressing an interactive element
- **WHEN** a user presses (mousedown/touch) an element with the `.interactive-press` class
- **THEN** it visually shifts 2px down and 2px right while its shadow disappears

#### Scenario: Reduced motion preference
- **WHEN** the user has `prefers-reduced-motion: reduce` enabled
- **THEN** the press transition completes in 1ms (existing hard cutoff applies)

### Requirement: Update chart token theming
Chart custom properties (`--chart-1` through `--chart-5`, `--chart-grid`) MUST use high-contrast solid colors for fills and bolder lines for chart grids.

#### Scenario: Viewing a data chart
- **WHEN** a chart component renders using chart tokens
- **THEN** it displays with bold grid lines and high-contrast solid fill colors

### Requirement: Preserve duration tokens
The system SHALL NOT modify existing duration tokens (`--duration-fast`, `--duration-base`, `--duration-slow`, `--duration-reveal`) or easing tokens, preserving the current motion rules.

#### Scenario: Triggering an animation
- **WHEN** an element animates using motion tokens
- **THEN** it uses the existing unmodified duration and easing values
