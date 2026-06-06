# UX Review Handover — Recent Visual/UX Work (PRs #69–#74)

> **Audience:** an AI agent (or human) picking up follow-up work on the recent UX
> refresh. This is a *review*, not a task list of approved work. Findings are
> ordered by severity. Items 1 and 2 are user-facing bugs; the rest are debt and
> process notes. Nothing here has been implemented — branch off `main` and open a
> change before touching code.
>
> **Reviewed:** PRs #70 (visual refresh), #71 (fully hide checked items),
> #72 (staple check-in flow), #73 (split instructions), #74 (revert backdrop-blur),
> plus #69 (hide in-trolley toggle). Reviewer: Opus, exploring work originally
> shipped by Sonnet.
>
> **Date:** 2026-05-31

## TL;DR

Each PR was clean, tested, and documented in isolation. The problems live in the
**seams between changes** — places where a new change contradicts a feature already
shipped. No single diff was wrong; the interactions were. The two that matter most
are genuine bugs, not polish:

1. The emoji + card-color visual layer is **English-only** and silently degrades in
   fr/es/zh-CN — the exact locales the i18n work (#66/#67) was built for.
2. "Fully hide checked items" (#71) made an accidentally-tapped meal-plan item
   **irreversible** — no undo, no way to un-check.

---

## 1. Emoji + color layer breaks in 3 of 4 languages 🔴 user-facing

**Files:** `src/lib/recipe-emoji.ts`, `src/app/recipes/page.tsx` (`cardBgColor`),
`src/lib/ingredient-emoji.ts`

`getRecipeEmoji(name)` matches **English keywords only**. The app translates recipe
names to fr/es/zh-CN, so:

```
getRecipeEmoji("Roast chicken") → "chicken" → 🍗   ✓
getRecipeEmoji("Poulet rôti")   → no match  → 🍳   ✗ (generic fallback)
getRecipeEmoji("宫保鸡丁")        → no match  → 🍳   ✗
```

Non-English users get the generic frying-pan on nearly every card — the "browse food
visually" goal disappears in the locales i18n was meant to serve.

**The fix is in the architecture already.** Per `docs/architecture.md`,
`Ingredient.name` is **always canonical English** regardless of recipe locale. So:

- Derive the recipe emoji from its **primary ingredient's English name** (or add a
  stored `emoji` field computed at import time), instead of the translated recipe name.
- `getIngredientEmoji()` already keys off canonical English and already covers
  pasta/chicken/beef/fish — which are **duplicated** in `recipe-emoji.ts` today.
  Consolidate the two overlapping keyword tables.

**Same root cause, separate symptom — `cardBgColor(recipe.name)`:** the pastel card
color is hashed from the *translated* name, so the same recipe is a different color in
English vs French. Visual identity should be stable → **hash `recipe.id`, not the
display string.**

---

## 2. "Fully hide checked items" made accidental taps irreversible 🔴 user-facing

**File:** `src/app/grocery-list/page.tsx` (`toggleItem`, `visibleGroups`)

#69 added a toggle to hide in-trolley items; #71 removed the toggle and *fully* hides
checked items. The two item types now behave differently on the **same tap gesture**:

| Item type            | On tap                                  | Recoverable?                          |
|----------------------|-----------------------------------------|---------------------------------------|
| Shopping-list extra  | optimistic delete + **10s undo toast**  | ✅ yes                                 |
| Meal-plan item       | added to `checkedKeys`, filtered out    | ❌ no undo, no "show checked" toggle   |

A meal-plan item tapped by accident **vanishes with no path back**. `allDone` shows 🎉
but still offers no per-item un-check. In a real supermarket, fat-fingering a row is
guaranteed.

That this took two PRs (#69 add toggle → #71 remove it, tests rewritten both times) is
itself a signal the shopping-mode mental model wasn't decided before coding.

**Suggested direction:** settle "what does *checked* mean and how do I undo it" first,
then implement once. A collapsible **"In trolley (n)"** section keeps checked items
recoverable without cluttering the active list. Make both item types undoable in the
same way.

---

## 3. backdrop-blur regression was predicted by its own design doc 🟠 process

**Files:** `src/components/BottomNav.tsx`, `openspec/changes/ui-visual-refresh/design.md`
(D5), reverted in #74.

D5 explicitly flagged the risk ("`backdrop-blur` has no effect if the browser composites
the nav separately"), shipped it anyway, and #74 reverted it for **global interaction
lag**. A persistent full-width `fixed` `backdrop-blur` element forces the compositor to
re-rasterize the blurred region on nearly every paint — including touches/scrolls
elsewhere. On a mobile PWA this is a known footgun; the whole app targets iOS Safari.

**Lesson for follow-up work:** a self-identified risk on a compositor-heavy effect
should **block and be device-tested before merge**, not ship with a shrug. Don't
reintroduce blur on persistent fixed elements without on-device validation.

---

## 4. Token system was set up, then bypassed 🟡 debt

**Files:** `src/app/globals.css` (defines `--primary`/`--secondary`/`--accent` + dark
variants) vs. the page components.

The new playful layer hardcodes raw Tailwind palette classes instead of the semantic
tokens:

```
FAB (recipes): bg-green-600     FAB (grocery): bg-blue-600
cards:         bg-amber-50 dark:bg-amber-950/30   (×6 colors, dark variant hand-maintained)
banners:       bg-amber-50 dark:bg-amber-950/30 border-amber-200 …
```

Result: **two parallel color systems** — semantic tokens (auto dark mode) and ad-hoc
literals (dark mode hand-maintained via the repeated `dark:…-950/30` pattern). That's
the maintenance burden the token system was meant to remove. Pick one: theme the accents
through tokens, or formally declare the palette as *the* system and stop half-using vars.

---

## 5. Smaller items 🟡

- **`refreshInterval: 15000` on the shopping session** (`grocery-list/page.tsx`): polls
  every 15s while the page is open — battery/data cost on a mobile PWA, and it races the
  optimistic local check state (hence the `if (sessionSyncTimer.current !== null) return`
  guard added to stop polled data clobbering local checks). SWR's default
  revalidate-on-focus likely matches the real need ("I picked my phone back up") better
  and cheaper. Re-evaluate whether the poll is needed at all.
- **One 1,621-line / 35-file visual PR (#70):** the design doc's own migration plan
  suggested splitting it (palette → emoji → states → i18n). Splitting would have isolated
  the blur regression to a 1-file PR and made the flagged risk reviewable. Prefer the
  small-PR discipline the repo already mandates, especially for big visual passes.

---

## Not yet reviewed

- `src/components/StartNewWeekWizard.tsx` (660 lines, largest new surface) — skipped in
  this pass. Worth a dedicated review.
- `src/components/StapleCheckinSheet.tsx` — only skimmed.

## Suggested next steps for the picking-up agent

1. Start with **#1 and #2** — they are user-facing bugs. Open an OpenSpec proposal for
   each (`openspec/changes/`), then implement on a feature branch with tests, per
   `CLAUDE.md` / `docs/testing.md`.
2. #3 is a "don't repeat this" guardrail — capture it wherever perf gotchas live (a note
   in `CLAUDE.md` Key Gotchas would fit).
3. #4 and #5 are debt — fold into a future cleanup pass, not urgent.
