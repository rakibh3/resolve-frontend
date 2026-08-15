## 1. Design Token Foundation (`app/globals.css`)

- [x] 1.1 Set `--radius: 0px` and verify all derived radii (`--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`, `--radius-4xl`) compute to 0–4px max
- [x] 1.2 Add neo-brutalist shadow tokens: `--shadow-neo-sm: 2px 2px 0px 0px currentColor`, `--shadow-neo: 3px 3px 0px 0px currentColor`, `--shadow-neo-lg: 5px 5px 0px 0px currentColor`
- [x] 1.3 Replace `.interactive-lift` with `.interactive-press` utility (translate 2px/2px + shadow removal on `:active`, compositor-only transitions)
- [x] 1.4 Update focus style utilities from `ring-3 ring-ring/50` pattern to `outline-2 outline-foreground outline-offset-2`
- [x] 1.5 Shift semantic state tokens (`--state-due`, `--state-overdue`, `--state-mastered`, `--state-reinforcement`, `--state-scheduled`) to high-chroma OKLCH values for both `:root` and `.dark`, verifying WCAG AA contrast
- [x] 1.6 Shift difficulty tokens (`--difficulty-easy`, `--difficulty-medium`, `--difficulty-hard`) to high-chroma values for both palettes
- [x] 1.7 Update chart tokens (`--chart-1` through `--chart-5`, `--chart-grid`) to high-contrast solid fills and bolder grid lines
- [x] 1.8 Verify duration tokens (`--duration-fast`, `--duration-base`, `--duration-slow`, `--duration-reveal`) and easing tokens are unchanged

## 2. Core UI Components (`components/ui/`)

- [x] 2.1 Restyle `button.tsx` — border-2 border-foreground, rounded-none, shadow-neo-sm, press-down active state, all variants (default, secondary, outline, ghost, destructive, link)
- [x] 2.2 Restyle `card.tsx` — border-2 border-foreground, rounded-none, shadow-neo, replace ring-1 ring-foreground/10
- [x] 2.3 Restyle `badge.tsx` — border-2 border-foreground, rounded-none (remove rounded-4xl), bold uppercase text, high-contrast fills
- [x] 2.4 Restyle `input.tsx` and `textarea.tsx` — border-2, sharp corners, shadow-neo-sm, crisp outline focus
- [x] 2.5 Restyle `select.tsx` — border-2, sharp corners, shadow-neo-sm, crisp outline focus, blocky dropdown
- [x] 2.6 Restyle `dialog.tsx` and `alert-dialog.tsx` — heavy 2px borders, hard shadow, stark backdrop
- [x] 2.7 Restyle `sheet.tsx` — thick borders, hard shadow, sharp corners
- [x] 2.8 Restyle `popover.tsx` — thick borders, hard shadow, sharp corners
- [x] 2.9 Restyle `tabs.tsx` — blocky triggers, inverted fill for active tab, thick borders
- [x] 2.10 Restyle `table.tsx` — bold 2px grid lines, high-contrast header cells
- [x] 2.11 Restyle `checkbox.tsx` — rectangular chunky shape, 2px border, sharp corners
- [x] 2.12 Restyle `switch.tsx` — retain rounded-full (functional exception), thicken border to 2px
- [x] 2.13 Restyle `sonner.tsx` — neo-brutal card framing, thick borders, hard shadow
- [x] 2.14 Audit remaining `components/ui/` files (dropdown-menu, tooltip, progress, separator, skeleton, scroll-area, etc.) for consistency with neo-brutalist tokens

## 3. Domain Components (`components/domain/`)

- [x] 3.1 Update `practice-state-badge.tsx` — rectangular high-contrast tags with 2px borders, remove pill shape
- [x] 3.2 Update `difficulty-badge.tsx` — geometric block badges with bold contrasting fills and thick borders
- [x] 3.3 Update `topic-chips.tsx` — sharp-cornered outline badges with 2px borders (keep outline style)
- [x] 3.4 Update `pattern-chips.tsx` — sharp corners, 2px borders, keep accent fill and `#` prefix
- [x] 3.5 Update `recall-badge.tsx` — rectangular high-contrast badges with thick borders
- [x] 3.6 Update `stage-label.tsx` — adapted to neo-brutalist typography and border style
- [x] 3.7 Audit `vocabulary-input.tsx` and `used-only-toggle.tsx` for consistency

## 4. Layout Chrome

- [x] 4.1 Update `app/(app)/layout.tsx` header — solid opaque background, `border-b-2 border-foreground`, remove `backdrop-blur`
- [x] 4.2 Update `app/(app)/_components/primary-nav.tsx` — solid box outlines or inverted fill for active links, thick borders
- [x] 4.3 Update `app/(app)/_components/mobile-nav.tsx` — thick-bordered panel, bold 2px separation between items
- [x] 4.4 Update `app/(app)/_components/owner-slot.tsx` — adapted to neo-brutalist style
- [x] 4.5 Update `app/(app)/_components/reminder-banner.tsx` — bold bordered banner, high-contrast fill

## 5. Page-Level Adjustments

- [x] 5.1 Update `app/(auth)/login/` — login form in neo-brutal container card with hard shadow (`--shadow-neo-lg`)
- [x] 5.2 Review `app/(app)/dashboard/_components/` — verify counters, due-problem-card, streak-card, lookahead-chart inherit tokens properly; adjust padding if visual density is too tight
- [x] 5.3 Review `app/(app)/problems/_components/` — verify problem table/cards, filters, pagination inherit tokens
- [x] 5.4 Review `app/(app)/insights/_components/` — verify summary cards, activity charts, backlog cards inherit tokens
- [x] 5.5 Review `app/(app)/recall/_components/` — verify recall sheet and card editor inherit tokens

## 6. Motion & Interaction

- [x] 6.1 Update `lib/motion.ts` — replace `.interactive-lift` references with `.interactive-press`, preserve all 5 motion rules
- [x] 6.2 Search codebase for any remaining `interactive-lift` class usage and replace with `interactive-press`

## 7. Typography Weight Adjustments

- [x] 7.1 Increase heading font weights in key pages — use `font-bold` or `font-extrabold` for page titles and section headings where appropriate
- [x] 7.2 Adjust category/super-heading styles — bolder uppercase tracking for neo-brutalist feel

## 8. Verification

- [x] 8.1 Run `pnpm build` to verify no compilation errors
- [x] 8.2 Run `pnpm lint` to verify no linting errors
- [x] 8.3 Visual review of light mode across all routes (dashboard, problems, recall, insights, settings, topics, patterns, search, login)
- [x] 8.4 Visual review of dark mode across all routes
- [x] 8.5 Verify `prefers-reduced-motion` still triggers the hard cutoff for all transitions
- [x] 8.6 Verify no Server/Client Component boundary changes — grep for `"use client"` additions or removals
