## 1. Phase 0 — Cocotte component + pose system (isolation)

- [x] 1.1 Create `src/components/cocotte/CocotteBody.tsx` — shared inline SVG body, lid, and two-leaf sprout (port geometry from `design/mascot/pot-poses.html`, body A2 + topper T2), using brand palette CSS vars
- [x] 1.2 Create `src/components/cocotte/Cocotte.tsx` — wrapper taking a `pose` prop (`"wave" | "stir" | "hold-basket" | "cheer" | "shrug"`) and `size`/`className`; composes shared body with per-pose arms/face/props/steam
- [x] 1.3 Implement the five poses (arms + face + props + steam) as per-pose fragments: Wave, Stir, Hold-basket, Cheer, Shrug
- [x] 1.4 Add accessibility handling: decorative usage marked `aria-hidden`; support an optional `label` for standalone use
- [x] 1.5 Write `tests/components/Cocotte.test.tsx` — renders each pose; shared body present across poses; reduced-motion path renders static
- [x] 1.6 Visually verify all five poses in the browser against the mockups before wiring; run `pre-pr`

## 2. Phase 1 — Wire poses into empty states

- [x] 2.1 Recipes empty state (`src/app/recipes/page.tsx`): replace 🧑‍🍳 with `<Cocotte pose="wave" />`; keep heading/subtext/CTA
- [x] 2.2 Meal-plan empty state (`src/app/meal-plan/page.tsx`): replace 📅 with `<Cocotte pose="wave" />`; keep heading/subtext/CTA
- [x] 2.3 Grocery empty state (`src/app/grocery-list/page.tsx`): replace 🛒 with `<Cocotte pose="hold-basket" />` (coordinate/sequence with `staple-checkin-flow`)
- [x] 2.4 Update/extend component tests for each empty state to assert the mascot renders and CTAs still work (jsdom, `waitFor`)
- [x] 2.5 Run `pre-pr`; open a focused PR for the empty-state wiring

## 3. Phase 2 — LoadingState → Stir pose (app-wide)

- [x] 3.1 Change `src/components/LoadingState.tsx` to signature `{ message }` rendering `<Cocotte pose="stir" />` (remove `emoji` prop)
- [x] 3.2 Update all call sites (recipes, recipe detail, meal-plan, grocery) to drop the `emoji` arg; `npx tsc --noEmit` clean
- [x] 3.3 Update `tests/components/` LoadingState tests for the new signature/mascot
- [x] 3.4 Run `pre-pr`

## 4. Phase 3 — Motion + celebration

- [x] 4.1 Add CSS keyframes for idle steam loop and entry bounce (reuse the mockup `rise`/`bob` keyframes); place in `globals.css` or a scoped module
- [x] 4.2 Wire Cheer + confetti into the grocery all-done state and the shopping-mode "Done" moment (`src/app/grocery-list/page.tsx`), replacing 🎉
- [x] 4.3 Wire Shrug into error / nothing-found states (e.g. empty search on recipes), replacing 🔥/plain error text
- [x] 4.4 Gate all looping/entry/confetti motion behind `@media (prefers-reduced-motion: reduce)` → static
- [x] 4.5 Add/extend tests for all-done (cheer) and error (shrug) states; run `pre-pr`

## 5. Phase 4 — Cocotte-voice copy (all locales)

- [ ] 5.1 Rewrite affected empty/loading/all-done/error strings in Cocotte's first-person voice in the `en` message file
- [ ] 5.2 Mirror the updated keys in `fr`, `es`, and `zh-CN` message files (localise tone, not literal English); add any new keys to all four
- [ ] 5.3 Verify no i18n key falls back to its raw string in any locale for the touched messages
- [ ] 5.4 Run `pre-pr`

## 6. Documentation

- [ ] 6.1 Update `docs/architecture.md` — add `src/components/cocotte/*` to the key-directories table and note the mascot pose/steam system; update the `LoadingState` entry
- [ ] 6.2 Update `README.md` to reflect the mascot identity where stack/purpose is described
- [ ] 6.3 Add a CLAUDE.md gotcha only if one emerges (e.g. SVG/reduced-motion or i18n pitfall); otherwise state "Docs: not required" reasons in the PRs
- [ ] 6.4 Final full `npm test` + `npx tsc --noEmit` + `npm run lint` green before the last PR

## 7. Phase 5 — Brand polish (optional / later)

- [ ] 7.1 (Optional) Splash screen featuring Cocotte
- [ ] 7.2 (Optional) Evolve `public/icon.svg` to unify book + Cocotte; regenerate PNG icons per `docs/deployment.md`
- [ ] 7.3 (Optional) Seasonal/alternate toppers as additional poses or props
