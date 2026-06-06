## Context

The app's only real brand asset is the home-screen icon (`public/icon.svg`).
In-app, empty and loading states use system emoji (🛒/🧑‍🍳/📅/🎉/🔥) keyed via
`playful-states`, which read as generic. During `/opsx:explore` we chose a
playful, full mascot — **Cocotte**, a round-belly enamelled Dutch oven with a
two-leaf sprout — to carry the identity inward. Static SVG mockups exist in
`design/mascot/` (`pot-styles.html`, `pot-variations.html`, `pot-poses.html`):
the chosen body is `A2`, topper `T2`, with five poses (Wave, Stir, Hold-basket,
Cheer, Shrug).

Constraints: Next.js 14 App Router, mostly client components; Tailwind; PWA
(keep bundle light); i18n via next-intl across `en`/`fr`/`es`/`zh-CN`; tests via
Vitest + RTL (jsdom). An active change `staple-checkin-flow` also edits
`src/app/grocery-list/page.tsx`.

## Goals / Non-Goals

**Goals:**
- One reusable Cocotte component with a `pose` prop; shared body, per-pose deltas.
- Replace system emoji in the three empty states, `LoadingState`, the grocery
  all-done state, and error/empty-search states with the right pose.
- CSS-only motion (idle steam, entry bounce, confetti); `prefers-reduced-motion` safe.
- Cocotte-voice copy across all four locales; existing test suite stays green.

**Non-Goals:**
- No backend/schema/API changes — purely front-end.
- Not replacing the home-screen `public/icon.svg` or adding a splash screen now
  (optional later phase).
- Not changing the grocery-list *category* aisle emoji (those are functional
  markers, not identity) or the favourite star-burst animation.
- No animation library (Lottie/Framer Motion runtime) — CSS keyframes only.

## Decisions

**1. Single component, `pose` prop, shared sub-components — over one file per pose.**
A `<Cocotte pose="wave" />` component composes a shared `<CocotteBody>` (body +
lid + sprout, constant geometry) with per-pose `<Arms>`/`<Face>`/`<Props>`/
`<Steam>` fragments. Rationale: the explore mockups proved only arms/face/props/
steam change; centralising the body means a 6th pose is a small addition, and
the spec mandates the shared body. Alternative (separate SVG per pose) duplicates
the body and drifts over time.

**2. Inline SVG React components — over static `.svg` files or sprites.**
Inline SVG lets poses share markup, theme via `currentColor`/CSS vars, and
animate via CSS targeting inner elements. Static files can't share the body or
animate internals cleanly. Mockup SVG in `design/mascot/` is the source geometry
to port.

**3. CSS-only motion, reduced-motion gated — over Lottie/JS animation.**
Idle steam loop, entry bounce, and confetti are CSS keyframes (the mockups
already demonstrate `rise`/`bob`/`hop`). Keeps the PWA light and avoids a new
dependency. All looping/entrance motion sits behind
`@media (prefers-reduced-motion: reduce)` to render static.

**4. `LoadingState` drops `emoji`, gains the Stir pose — accept the API change.**
`LoadingState` currently takes `emoji` + `message`. The new signature is
`message`-only, rendering the Stir pose. All call sites (recipes, recipe detail,
meal-plan, grocery) are updated in the same task. Rationale: the mascot is the
point; a per-call emoji is now meaningless. This is an internal component, so the
breaking signature is contained.

**5. Copy as new/!updated i18n keys in the existing namespaces.**
Cocotte-voice strings reuse the existing keys (`recipes.emptyTitle`,
`grocery.emptySubtext`, `common.errorTitle`, …) so only values change, in all
four locale files. Where a celebratory/voice line has no key yet, add one
following the namespace convention. Keeps the `playful-states` i18n requirement
("no key falls back to raw string in any locale") satisfied.

**6. Phased rollout in `tasks.md` — small, independently shippable PRs.**
Phase 0 (component in isolation) → Phase 1 (empty states) → Phase 2
(`LoadingState`) → Phase 3 (motion) → Phase 4 (locale voice pass) → Phase 5
(optional icon/splash). Each phase is a focused PR per the repo's trunk-based
workflow.

## Risks / Trade-offs

- **Hand-ported SVG looks worse than the mockup** → Port coordinates directly
  from `design/mascot/pot-poses.html`; review each pose rendered in the browser
  before wiring it into pages.
- **Merge conflict with `staple-checkin-flow` on `grocery-list/page.tsx`** →
  Sequence the grocery empty/all-done edits (Phase 1/Phase 3 grocery parts)
  after that change merges, or rebase; keep grocery edits in their own PR.
- **`LoadingState` signature change breaks a missed call site** → `tsc --noEmit`
  catches all callers; update them in the same commit and run `pre-pr`.
- **Locale drift (a key updated in `en` but not `fr`/`es`/`zh-CN`)** → Do the
  voice pass as one task touching all four files together; the existing i18n
  requirement is the guardrail.
- **Animation jank / battery on mobile** → CSS transforms/opacity only; gate
  loops behind reduced-motion.

## Migration Plan

Front-end only, no data migration. Ship per phase behind normal PR review; each
phase is independently revertable (revert the PR). No feature flag needed — the
mascot simply replaces emoji in the touched states. Rollback = revert the phase
PR; earlier phases remain functional because the Cocotte component is additive
until a state is switched to use it.

## Open Questions

- Final exact wording of Cocotte-voice lines per locale (drafts in the proposal;
  refine during Phase 4 — translations should localise tone, not translate the
  English literally).
- Whether the meal-plan empty state uses plain `wave` or a `wave`-with-calendar
  prop variant (decide when wiring Phase 1; spec only requires `wave`).
- Phase 5 (icon evolution / splash) scope — deferred; revisit after Phases 0–4 ship.
