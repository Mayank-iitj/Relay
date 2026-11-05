# Design: Relay

## Visual World: Industrial Data Tool
Inspired by high-density technical interfaces like Linear, GitHub PRs, and AWS CloudTrail. It feels like a professional instrument: precise, muted, and transparent.

## Palette
- **Canvas Base** (`#0C0D0E`): Subdued Charcoal. The primary ground.
- **Surface Elevated** (`#151718`): Secondary surfaces and active states.
- **Surface Border** (`#26292B`): Subtle dividers and structural lines.
- **Text High-Contrast** (`#ECEDEE`): Primary headers and critical data.
- **Text Low-Contrast** (`#8B8D98`): Metadata, timestamps, and secondary labels.
- **Status Neutral** (`#1E2022` / `#323539` / `#9DA1A7`)
- **Status Verification Pass** (`#0F2E1B` / `#1B5430` / `#4ADE80`)
- **Status Conflict Alert** (`#382800` / `#6E4F00` / `#FACC15`)
- **Status Critical Security** (`#381212` / `#682323` / `#F87171`)

## Typography
- **Functional Sans:** Inter, -apple-system, BlinkMacSystemFont. For all general UI and readability.
- **System Monospace:** ui-monospace, SFMono-Regular, "Roboto Mono". Used for IDs, hashes, timestamps, and data grids.

## Materials & Effects
- **Hairline Borders:** 1px borders for maximum precision.
- **Flat Surfaces:** No gradients or organic glows. Depth is achieved through subtle tonal shifts.
- **Deterministic Badges:** Sharp, small, and clearly color-coded status indicators.

## Composition
- **High Information Density:** Maximum utility per pixel. Content is tightly packed but logically separated.
- **Tabular Hierarchy:** Use of grids and lists to organize complex state.
- **Split-Pane Layout:** Direct linkage between a claim (left) and its evidence (right).

## Signature Interactions
- **Citation Jump:** Clicking a citation chip instantly scrolls and highlights the exact source quote in the evidence ledger.
- **Role Projection Shift:** Switching roles instantly updates the visibility of claims based on security classification.
- **Cryptographic Freeze:** A visual transition from "Editable" to "Locked" (Frozen) status.
