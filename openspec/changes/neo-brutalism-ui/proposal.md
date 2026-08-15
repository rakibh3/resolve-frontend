## Why

ReSolve's current UI follows a polished, minimalist Vercel/Linear-inspired aesthetic — soft neutrals, subtle 1px borders, rounded corners, and muted pastel semantic colors. While clean and professional, this visual language blends in with every other modern SaaS dashboard. A neo-brutalism redesign gives the app a bold, distinctive identity: heavy borders, hard offset shadows, punchy high-saturation colors, and tactile press-down interactions that make every element feel like a physical object you can push. The style is gaining traction in developer tools and productivity apps (Notion's recent experiments, Gumroad, various indie-hacker tools) and suits ReSolve's problem-solving focus — the deliberate roughness communicates confidence and directness.

## What Changes

- **Design tokens overhaul**: Replace the entire visual foundation — border radii shrink to 0–4px, borders thicken to 2–3px solid, shadows become hard unblurred offsets, and the color palette shifts to high-chroma punchy fills while preserving WCAG AA contrast.
- **Component restyling**: All 23 `components/ui/` primitives (button, card, badge, input, dialog, tabs, etc.) adopt neo-brutalist styling — thick borders, hard shadows, blocky shapes, and press-down active states instead of float-up hover.
- **Domain component adaptation**: Practice state badges, difficulty badges, topic/pattern chips, and recall badges switch from soft pastel pills to bold rectangular tags with high-contrast fills and thick outlines.
- **Layout chrome**: Header, navigation, and page shells move from subtle blur/border-b to crisp solid borders with stark separation.
- **Motion system update**: Replace `.interactive-lift` (float up 2px) with press-down mechanics (translate + shadow removal on active), keeping the compositor-only and reduced-motion rules intact.
- **Typography weight shift**: Increase heading weights and introduce bolder tracking for category labels, leaning into the geometric grotesque character of Geist at heavy weights.
- **Chart theming**: Update chart CSS custom properties for high-contrast bar outlines, bold grid lines, and punchy fill colors that complement the neo-brutalist palette.

## Capabilities

### New Capabilities
- `neo-brutal-design-tokens`: New design token system covering border radii, shadow primitives, high-chroma color palette, focus ring style, and interaction patterns (press-down vs float-up) expressed as CSS custom properties in `globals.css`.
- `neo-brutal-components`: Restyled UI component layer — all `components/ui/` and `components/domain/` files updated to use neo-brutalist borders, shadows, shapes, and interaction states while preserving Base UI accessibility primitives.
- `neo-brutal-layout`: Updated layout chrome (header, navigation, page shells, login) with bold structural borders, stark section separation, and adapted responsive behavior.

### Modified Capabilities
_(No existing specs to modify — this is the first spec-driven change.)_

## Impact

- **`app/globals.css`**: Core token redefinition — radius, shadows, colors, focus states, interaction utilities, chart tokens, semantic state colors.
- **`components/ui/` (23 files)**: Every shadcn/Base UI primitive restyled — button, card, badge, input, textarea, select, dialog, sheet, popover, tabs, table, checkbox, switch, sonner, etc.
- **`components/domain/` (~8 files)**: Practice state, difficulty, topic/pattern chips, recall badges, vocabulary input, stage label.
- **`app/(app)/layout.tsx` + `_components/`**: Header, primary nav, mobile nav, owner slot, reminder banner.
- **`app/(auth)/login/`**: Login form and page container.
- **`components/charts/`**: Chart token overrides (no structural chart changes — only CSS custom property values).
- **`lib/motion.ts`**: Replace `.interactive-lift` definition, keep all 5 motion rules intact.
- **`app/layout.tsx`**: Possible font weight adjustments (Geist remains, but heavier weight configuration).
- **No API changes, no routing changes, no data layer changes.** This is purely a visual reskin.
