## Why

The app's identity stops at the home-screen icon. Inside the app, every empty
state and loading indicator falls back to generic system emoji (🛒 🧑‍🍳 📅 🎉)
that render identically in every other app on the phone — so the experience
feels off-the-shelf, not *ours*. We want a custom mascot with enough personality
that users open the app partly to see it. Decided during `/opsx:explore`:
direction "playful & fun", full mascot. Mockups are in `design/mascot/`.

## What Changes

- Introduce **Cocotte** — a friendly round-belly enamelled Dutch-oven character
  (mockup body `A2` + two-leaf sprout topper `T2`) as the app's in-product mascot.
- Build a reusable **pose + steam-mood system**: one constant body/lid/sprout;
  arms, face, props and the steam change per `pose`. Five starter poses —
  **Wave, Stir, Hold-basket, Cheer, Shrug** — with steam encoding mood.
- Replace the generic system emoji in empty states and loading with Cocotte:
  - Recipes empty → **Wave**; Meal-plan empty → **Wave**/point; Grocery empty → **Hold-basket**
  - `LoadingState` → **Stir** (one component, swaps the emoji app-wide)
  - Grocery all-done / shopping "Done" → **Cheer** + confetti
  - Error / nothing-found (e.g. empty search) → **Shrug**
- Rewrite the affected empty-state/loading copy in Cocotte's warm, cheeky
  first-person voice, across all four locales (`en`, `fr`, `es`, `zh-CN`).
- Add motion: spring/bounce entry, idle steam loop, confetti burst on celebration —
  CSS-driven, no Lottie (keep the PWA light).

## Capabilities

### New Capabilities
- `cocotte-mascot`: the Cocotte character component and its reusable pose +
  steam-mood system — the canonical pose set, visual style/palette, motion
  behaviour, and the API (`pose` prop + shared parts) for adding poses cheaply.

### Modified Capabilities
- `playful-states`: the empty-state and `LoadingState` requirements currently
  mandate specific system emoji (🧑‍🍳, 🛒, 📅, 🎉) and emoji-based copy. They
  change to render the corresponding Cocotte pose and Cocotte-voice copy instead.

## Impact

- **Components**: new `src/components/Cocotte*` (mascot + poses); `src/components/LoadingState.tsx` (emoji → Stir pose).
- **Pages**: `src/app/recipes/page.tsx`, `src/app/meal-plan/page.tsx`, `src/app/grocery-list/page.tsx` (empty/all-done states; error/empty-search).
- **i18n**: empty-state/loading message strings in all four locale message files (next-intl).
- **Tests**: component tests for each empty state + `LoadingState` (jsdom); existing suite stays green.
- **Docs**: `docs/architecture.md` (new component entries), `README.md`; `CLAUDE.md` if a gotcha emerges.
- **Out of scope**: no backend/schema/API changes; purely front-end identity work. The existing `public/icon.svg` stays — evolving the app icon and splash screen is an optional later phase.
- **Coordination**: active change `staple-checkin-flow` also touches `src/app/grocery-list/page.tsx` — sequence the grocery empty-state work to avoid conflicts.
