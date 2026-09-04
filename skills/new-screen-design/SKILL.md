---
name: new-screen-design
description: Use this skill any time a new screen is being built for the Phone Repair Shop App, to ensure it matches the established Uber-inspired black-and-white design language. Covers colors, typography, spacing, components, and status badge conventions.
---

# Building a New Screen (Design Language)

## When to use this
Any time you create a new screen or significantly restyle an existing one. This ensures visual consistency across the customer side and shop owner side, since both live in the same app.

## Core design rules

- **Color palette**: White (`#FFFFFF`) backgrounds, black (`#000000`) for primary text and primary action buttons/accents. Gray (a single mid-gray, e.g. `#8A8A8A`) for secondary/subtext only. No other colors unless explicitly requested by the client.
- **Typography**: Bold black for headings and primary labels. Regular weight gray for secondary/supporting text. Avoid more than two font weights per screen.
- **Buttons**:
  - Primary action (Submit, Accept, Continue): full-width, black background, white bold text, rounded corners (matching existing button radius in the app).
  - Secondary/destructive action (Reject, Cancel): white background, black border, black text.
- **Status badges**: Pill-shaped, black background with white text (or white background with black border, depending on emphasis needed) — used for request status (pending/accepted/rejected/completed).
- **Cards**: White background, subtle drop shadow instead of a visible border, generously rounded corners, consistent internal padding (match spacing already used in existing cards — don't introduce a new spacing scale).
- **Whitespace**: Generous margins and padding — avoid cramming multiple sections tightly together. When in doubt, add more whitespace, not less.
- **Icons**: Simple, consistent line-style icons throughout — do not mix icon styles (e.g. don't mix filled icons with outline icons on the same screen).

## Process for building a new screen

1. Check `design.md` for an existing Stitch prompt matching this screen — use it as the layout reference.
2. Reuse existing shared components (buttons, cards, status badges, `IconGridSelector`) rather than creating new one-off versions.
3. If a new UI pattern is genuinely needed that isn't covered by `design.md` or an existing component, flag it back to the user rather than inventing a new style silently.
4. Keep text minimal — if a label can be conveyed with an icon instead, prefer the icon (see `icon-grid-selector` skill for selection-style inputs).

## Example prompt to the agent
"Build the shop owner's Dashboard/Stats screen using our new-screen-design skill and the layout described in design.md."
