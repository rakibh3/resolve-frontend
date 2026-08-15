## Context

ReSolve is a Next.js 16.3 spaced-repetition app for LeetCode problems. Its UI is built on shadcn (`base-nova` style) with Base UI (`@base-ui/react`) primitives, Tailwind CSS v4, and OKLCH-based design tokens in `app/globals.css`. The current aesthetic is polished minimalism: soft rounded corners (`rounded-xl`), subtle 1px borders at 10% opacity, no heavy shadows, and muted low-saturation pastel fills for semantic states.

The change is a complete visual reskin to neo-brutalism — a style characterized by thick borders, hard unblurred offset shadows, sharp or minimal border radii, high-chroma colors, and tactile press-down interactions. The data architecture (Server Components everywhere, server-only API layer, cookie-based auth) and component behavior (Base UI accessibility primitives) are completely untouched.

Key architectural constraints:
- All 23 `components/ui/` files use `@base-ui/react` — only class names and CSS change, not imports or component structure.
- Domain components (`components/domain/`) use semantic tokens from `globals.css` — the tokens shift in value but keep their names.
- Charts are vendored in `components/charts/` and themed via CSS custom properties — only token values change.
- Motion rules (compositor-only, reduced-motion hard cutoff) are preserved; only the interaction pattern changes (lift → press).
- The header, nav, and page shells are Server Components with client leaves — no boundary restructuring.

## Goals / Non-Goals

**Goals:**
- Replace the entire visual language with neo-brutalism while preserving every functional behavior.
- Maintain WCAG AA contrast ratios across both light and dark themes with the new high-chroma palette.
- Keep the existing CSS custom property interface so downstream consumers (charts, domain components) adopt the new look automatically via token inheritance where possible.
- Preserve all 5 motion rules; only replace the interaction pattern from float-up to press-down.
- Complete the reskin without changing any API calls, routing, data fetching, or Server/Client Component boundaries.

**Non-Goals:**
- Changing component behavior or Base UI primitive usage — this is styling only.
- Adding new pages, routes, or features.
- Restructuring the component file hierarchy.
- Introducing a new font family — Geist stays, used at heavier weights for headings.
- Changing chart implementations (visx/recharts) — only CSS custom property values change.
- Full dark mode redesign iteration — the neo-brutalism tokens apply to both palettes in one pass, following the existing `:root` / `.dark` dual-palette structure.

## Decisions

### D1: Token-first approach — globals.css as the single source of truth

**Decision**: All visual changes flow from `app/globals.css` token redefinitions. Components consume tokens (`--radius`, `--shadow-neo`, border utilities) rather than having neo-brutalist values hard-coded per component.

**Rationale**: The existing system already has a well-structured token layer. A token-first approach means:
- Charts, domain badges, and any future components automatically inherit the new look.
- Theme switching (light/dark) continues to work through the same `:root` / `.dark` mechanism.
- Reverting is a single-file revert of `globals.css` plus component class changes.

**Alternatives considered**:
- *Per-component hard-coded styles*: Would work but creates drift and makes theme consistency fragile. Rejected.
- *Tailwind v4 theme extension only*: Tailwind's `@theme` block can define some tokens, but the interaction utilities (`.interactive-press`) and shadow composites need CSS `@layer` definitions. Using `globals.css` directly is more explicit.

### D2: New shadow token system with currentColor

**Decision**: Introduce three shadow tokens using `currentColor` for automatic light/dark adaptation:
```
--shadow-neo-sm: 2px 2px 0px 0px currentColor
--shadow-neo: 3px 3px 0px 0px currentColor
--shadow-neo-lg: 5px 5px 0px 0px currentColor
```

**Rationale**: `currentColor` inherits from the element's `color` property, which in dark mode is light and in light mode is dark. This means cards, buttons, and inputs automatically get appropriate shadow contrast without separate light/dark shadow definitions. For elements where `currentColor` doesn't work well (e.g., on colored backgrounds), the component can use `var(--foreground)` explicitly.

**Alternatives considered**:
- *Fixed `#000` shadows*: Works in light mode, invisible in dark mode. Rejected.
- *Separate light/dark shadow tokens*: More tokens to maintain; `currentColor` elegantly solves this. Rejected.
- *OKLCH shadow colors*: Adds complexity without benefit since shadows are achromatic. Rejected.

### D3: Press-down interaction replacing float-up

**Decision**: Replace `.interactive-lift` (`translate3d(0, -2px, 0)` on hover) with `.interactive-press`:
```css
.interactive-press {
  transition: transform var(--duration-fast) var(--ease-out),
              box-shadow var(--duration-fast) var(--ease-out);
}
.interactive-press:active {
  transform: translate(2px, 2px);
  box-shadow: none;
}
```

**Rationale**: Neo-brutalism's defining interaction metaphor is elements that feel like physical blocks you press into the page. The hard shadow creates the "elevation"; pressing removes it while translating the element by the shadow's offset. This preserves compositor-only animation (transform + box-shadow are both compositor-friendly) and works with `prefers-reduced-motion` via the existing `animation-duration: 1ms` override.

**Alternatives considered**:
- *Hover-triggered press*: Feels wrong on touch; `active` is the natural press state. The hover state can optionally show a subtle border-color change.
- *Scale-down on press*: Doesn't align with the offset-shadow metaphor and feels more iOS than brutalist. Rejected.

### D4: Border radius set to 0 with controlled exceptions

**Decision**: Set `--radius: 0px`. All derived radii (`--radius-sm` through `--radius-xl`) become 0. Two intentional exceptions:
- Switches keep `rounded-full` (functional affordance — a square switch doesn't read as a toggle).
- Avatar images keep a small radius or circle (recognition affordance).

**Rationale**: Sharp corners are the defining geometric characteristic of neo-brutalism. The exceptions are where rounding serves a functional purpose beyond aesthetics.

### D5: Color strategy — achromatic base, high-chroma semantics

**Decision**: Keep the base palette (background, foreground, card, muted) achromatic (pure black/white/grays in OKLCH). Shift semantic state tokens and difficulty tokens to high-chroma, high-saturation values while keeping the same hue families:
- `--state-due`: Bold amber/yellow
- `--state-overdue`: Vivid red/coral
- `--state-mastered`: Electric green
- `--state-reinforcement`: Hot magenta
- `--state-scheduled`: Bright cyan/blue
- `--state-idle`: Stays neutral

The accent/primary color gets a single bold hue (electric yellow `oklch(0.9 0.2 95)` in light mode is a strong candidate — it's a neo-brutalism staple).

**Rationale**: Neo-brutalism thrives on contrast between stark neutral structure and punchy color accents. Keeping the structural palette achromatic ensures borders and shadows always read cleanly, while semantic tokens carry the visual energy.

### D6: Component edit strategy — className-only changes

**Decision**: Every component file change is strictly limited to Tailwind className strings and CSS utility classes. No Base UI import changes, no prop interface changes, no render logic changes.

**Rationale**: This ensures zero risk of behavioral regression. A className-only change can't break accessibility, keyboard navigation, or focus management provided by Base UI primitives.

### D7: Focus style — crisp outline offset

**Decision**: Replace the current `focus-visible:ring-3 ring-ring/50` with:
```
focus-visible:outline-2 outline-foreground outline-offset-2
```

**Rationale**: Soft rings conflict with the neo-brutalist aesthetic. A crisp 2px outline with a 2px offset creates clear focus indication that reads well against both the thick borders and hard shadows. The offset prevents the outline from being visually absorbed by the element's own border.

## Risks / Trade-offs

**[Visual density increase]** → Thick borders and hard shadows consume more visual space than the current minimal design. Mitigation: Slightly increase padding within cards and buttons to compensate. Monitor the dashboard and problem list for crowding.

**[Dark mode shadow visibility]** → `currentColor` shadows in dark mode may appear too bright on some backgrounds. Mitigation: Test with the actual dark palette; fall back to `oklch(1 0 0 / 40%)` for shadow color in `.dark` if needed.

**[Chart readability]** → High-contrast chart tokens could make dense data visualizations (lookahead, activity heatmap) visually noisy. Mitigation: Charts are vendored and can have their own `--chart-*` tokens tuned independently of the base palette.

**[Accessibility — motion sensitivity]** → Press-down interaction translates the element position, which could be disorienting. Mitigation: The existing `prefers-reduced-motion` hard cutoff already forces `transition-duration: 1ms !important`, so the position change is effectively instant (perceived as a state change, not animation).

**[Subjective preference — the aesthetic is polarizing]** → Neo-brutalism is a love-it-or-hate-it style. Mitigation: This is a conscious design choice. The token-first approach means reverting to the original look is a single `globals.css` revert plus component class restoration.
