# UX Professional Polish — Spec & Action Plan

> **Audience:** the AI agent (likely Sonnet) executing this plan, phase by phase.
> **Author:** UX audit pass over the full UI surface (every page + interaction
> component), 2026-06-11. Builds on `docs/ux-review-handover.md` (items 1–2 of
> that doc were already fixed in PRs #76–#77; item 4 — the token system being
> bypassed — is fixed by Phase 1 here).
>
> **Goal:** make the app indistinguishable from a professionally built mobile
> app from a UX standpoint. That bar is mostly NOT about adding features — it is
> about **consistency, feedback, accessibility, and finish**. Professional apps
> feel professional because every screen behaves the same way, every action
> gives feedback, nothing dead-ends, and nothing is half-translated or
> half-themed.

---

## How to execute this plan (read first)

- **One phase = one PR.** Execute phases in order — later phases depend on
  components introduced earlier (tokens → toast → everything else). Branch
  names are given per phase. Follow the git workflow in `CLAUDE.md` exactly
  (branch from updated `main`, push immediately, push after every commit,
  tests green before PR, never merge without user approval).
- **Pre-PR checks** (the `pre-pr` command referenced in `CLAUDE.md` is not a
  package script — run these three): `npm test` · `npm run lint` ·
  `npx tsc --noEmit`. All must pass.
- **Every phase ships tests.** Patterns and gotchas are in `docs/testing.md`
  (jsdom docblock, StrictMode double-effects, stable `useRouter` mocks,
  `SVGAnimatedString.baseVal`). Untested code is not done.
- **For visual phases (1, 6, 7): deploy a preview (`vercel`) and post the URL
  in the PR description** so the user can verify on a real phone before merge.
- **i18n is non-negotiable:** every new user-visible string gets a key in ALL
  FOUR message files (`messages/en.json`, `fr.json`, `es.json`, `zh-CN.json`).
  Machine translation is fine; match the existing playful tone ("Something got
  burnt.", "Checking the recipe box…"). Never hardcode display text — including
  `aria-label`s.
- **Acceptance criteria are binding.** "Out of scope" lists are equally
  binding — do not fix neighbouring things you notice; note them in the PR
  description instead.

### Hard guardrails (do not violate in any phase)

1. **No new runtime dependencies.** Everything below is achievable with what is
   installed (React 18, Tailwind, lucide-react, next-intl, SWR). The toast
   system, focus trap, etc. are specified as small in-house components on
   purpose — they match the existing bespoke `BottomSheet`/`ActionSheet` style.
2. **Never apply `backdrop-blur` (or any filter) to persistent `fixed`
   elements.** This caused a global interaction lag regression once already
   (PR #74, `docs/ux-review-handover.md` §3).
3. Don't touch `export const dynamic = "force-dynamic"`, the
   `CHOKIDAR_USEPOLLING` dev script, or the `prisma generate &&` build prefix.
4. Don't redesign information architecture, navigation structure, or the data
   model. This plan is polish, not rework.
5. `StartNewWeekWizard.tsx` (1,457 lines) is **out of scope** except where a
   phase explicitly names it. It inherits global improvements (tokens, dark
   mode) automatically. It needs its own dedicated review later — do not
   drive-by refactor it.

---

## Audit summary

### What is already good — preserve it

- Mobile-first patterns: bottom tab nav with safe-area insets, bottom sheets
  with drag-to-dismiss, pull-to-refresh, swipe-to-reveal, haptics.
- The Cocotte mascot system (poses, seasonal toppers, `prefers-reduced-motion`
  respected) — this is the app's personality. Extend its use; never remove it.
- Optimistic updates with SWR throughout; undo toast on grocery item removal.
- Playful, consistent microcopy voice in `messages/*.json`.
- 44px minimum touch targets on most rows and primary controls.

### What fails the professional bar

| # | Problem | Where | Fixed in |
|---|---------|-------|----------|
| 1 | Two parallel colour systems: semantic tokens defined but bypassed with raw `green-600` / `blue-600` / literal `#007AFF`; accent colour differs per page (green on Recipes, blue on Grocery) for no reason a user can learn | FABs, nav, steppers, links, swipe action, empty-state CTAs | Phase 1 |
| 2 | Dark mode is dead code: full `.dark` token set + hand-maintained `dark:` variants exist, but nothing ever sets the `dark` class — users in system dark mode get a blinding light app | `globals.css`, `tailwind.config.ts` | Phase 1 |
| 3 | Pinch-zoom disabled (`maximumScale: 1, userScalable: false`) — WCAG 1.4.4 failure | `src/app/layout.tsx` | Phase 3 |
| 4 | No global feedback system: failed saves/deletes are silently swallowed (`fetch` results unchecked on ~12 mutations); the one undo toast is bespoke to grocery and renders at the top of the screen | all pages | Phase 2 |
| 5 | Destructive actions inconsistent: recipe delete = confirm sheet; meal-plan remove, schedule remove, product delete = instant, **no confirm and no undo** | meal-plan, schedule, products pages | Phase 2 |
| 6 | Sheets aren't accessible dialogs: no focus trap, no focus restore, no `aria-labelledby`; small hit targets (28px steppers, ~24px delete icons) | `BottomSheet`, `ActionSheet`, several pages | Phase 3 |
| 7 | Hardcoded English survives in 4-locale app: "Cancel" (ActionSheet), "Edit" (SwipeableRow), "Today" (schedule), ~8 aria-labels; dates formatted with hardcoded `"en-GB"` | various | Phase 3 |
| 8 | Wrong aria-labels: recipe-detail servings stepper announces "Cancel" / "Add" for −/+ | `recipes/[id]/page.tsx` | Phase 3 |
| 9 | State handling inconsistent: Schedule + Products use plain "Loading…" text while other pages use the Cocotte loader; Schedule's empty state is a 📅 emoji (off-brand) and shows the *same* message for two different situations; only Recipes handles SWR fetch errors | schedule, products pages | Phase 4 |
| 10 | Schedule's add-slot overlay is a hand-rolled modal that duplicates `BottomSheet` without its animation, drag-dismiss, or scroll lock | `schedule/page.tsx` | Phase 4 |
| 11 | Data loss: recipe form (incl. a just-AI-imported recipe) lives in a drag-dismissable sheet with **no unsaved-changes guard** — one stray swipe discards everything | `recipes/page.tsx`, `recipes/[id]/page.tsx` | Phase 5 |
| 12 | Grocery rows give no checkbox affordance — tapping anywhere silently deletes the row; nothing signals "tap = bought" | `grocery-list/page.tsx` | Phase 6 |
| 13 | Mixed icon language: lucide icons + text glyphs (★/☆) + enclosed-unicode step numbers (①②③ — rendering varies by platform font) | recipe cards, recipe detail | Phase 7 |
| 14 | Raw `<select>` elements styled ad-hoc, inconsistent with shadcn inputs, duplicated 5× | grocery, products, settings, signin, RecipeForm | Phase 7 |
| 15 | `CARD_BG_COLORS` duplicated in two pages; meal-plan colours by list *position* (colour changes when list reorders) while recipes colours by id | recipes + meal-plan pages | Phase 1 |
| 16 | `LOCALE_LABELS` duplicated in signin + settings | both pages | Phase 7 |
| 17 | Numeric fields use bare `type="number"` without `inputMode`, so iOS shows the full keyboard for quantity entry; no clear-× in search fields; no show/hide password | forms across the app | Phase 5 |

---

## Binding design decisions

These were decided during the audit. Do not relitigate them mid-phase; if one
proves impossible, stop and ask the user.

- **D1 — One accent.** Green is the brand (mascot, logo, theme colour). The
  semantic `--primary` token becomes green; *every* accent-coloured control
  uses tokens. Blue disappears entirely. Per-page personality stays in the
  pastel card palette, which becomes an official, centralised decorative
  palette.
- **D2 — System dark mode, no toggle.** Follow `prefers-color-scheme` via
  Tailwind's `media` strategy. No settings toggle (scope control).
- **D3 — One feedback channel.** A single global toast (bottom, above the tab
  bar, thumb-reachable): used for undo, save errors, confirmations. Built
  in-house, ~120 lines.
- **D4 — Two destructive patterns, applied by rule.** Hard-to-recreate objects
  (recipe, product) → ActionSheet confirm. Cheap list rows (meal-plan entry,
  scheduled meal, shopping item) → instant removal + 6-second undo toast.
  Nothing is ever instant-and-irreversible.
- **D5 — Checked ≠ vanished.** Grocery rows get a visible checkbox circle; a
  tap visibly checks the row before it leaves, and undo is always offered.
- **D6 — Cocotte owns all empty/loading/error states.** Every page uses the
  same `LoadingState` and a new shared `EmptyState`; no more plain-text or
  emoji fallbacks.
- **D7 — The form is sacred.** Any sheet containing user-entered data guards
  dismissal behind a discard confirmation once dirty.

---

## Phase 1 — Design-token unification + real dark mode

**Branch:** `feat/ux-tokens-dark-mode` · **Risk:** medium (touches every page
visually) · **Preview deploy required.**

### 1a. Make `--primary` the green brand accent

In `src/app/globals.css`:

```css
:root {
  --primary: 142 72% 29%;            /* green-700 — AA contrast w/ white text */
  --primary-foreground: 0 0% 100%;
  --ring: 142 72% 29%;
  /* all other light tokens unchanged */
}
```

Dark values (inside the dark block created in 1b):

```css
  --primary: 142 69% 58%;            /* green-400 */
  --primary-foreground: 145 80% 10%; /* green-950 */
  --ring: 142 69% 58%;
```

Rationale: green-600 (`#16a34a`) fails AA (≈3:1) with white text, so the token
is green-700; the previous near-black primary moves out of the way. Audit the
few places relying on primary-being-black (e.g. `bg-foreground text-background`
toast styling is unaffected; the default `Button` variant becomes green — that
is intended and is the main visual change of this phase).

### 1b. Enable system dark mode

- `tailwind.config.ts`: `darkMode: ["class"]` → `darkMode: "media"`.
- `globals.css`: replace the `.dark { … }` selector with
  `@media (prefers-color-scheme: dark) { :root { … } }` (same variable values,
  plus the dark primary values above).
- `src/app/layout.tsx`: replace the single `themeColor: "#16a34a"` with the
  media-query array form so the browser chrome matches the page background:

```ts
themeColor: [
  { media: "(prefers-color-scheme: light)", color: "#fbfbf8" }, // hsl(60 33% 98%)
  { media: "(prefers-color-scheme: dark)",  color: "#0e0d0c" }, // hsl(20 10% 5%)
],
```

- **Dark-mode QA sweep is part of this phase:** open every page (recipes,
  detail, new/edit sheet, meal plan, wizard, schedule, grocery, products,
  settings, signin, reset-password) in dark mode on the preview deploy. The
  existing hand-written `dark:` variants now actually run for the first time —
  fix any unreadable combination you find (most common: hardcoded `bg-stone-50`
  / `text-white` not having a dark counterpart). List every page checked in the
  PR description.

### 1c. Kill every hardcoded accent

Replace, repo-wide (`grep` for each — list is exhaustive as of audit date):

| Current | Replacement |
|---|---|
| `bg-green-600 text-white` (recipes FAB, empty-state CTAs) | `bg-primary text-primary-foreground` |
| `bg-blue-600 text-white` (grocery FAB, staple-checkin add button, grocery empty CTA) | `bg-primary text-primary-foreground` |
| `bg-blue-500` (SwipeableRow edit action) | `bg-primary` |
| `text-[#007AFF] dark:text-blue-400` (iOS-style Cancel links, recipes + meal-plan) | `text-primary` |
| `text-green-600` / `text-green-600 dark:text-green-400` (active nav tab, step numbers, import icons, "Ready" chip text) | `text-primary` |
| BottomNav `bg-stone-50 border-stone-200 dark:bg-stone-900 dark:border-stone-700` | `bg-background border-border` |

Leave the amber "Today" treatment on the schedule page and the green "Ready"
chip *backgrounds* as-is (status colours, not accents) — but do switch their
text/foreground colours to token-friendly values only if dark QA shows a
problem.

### 1d. Centralise the decorative card palette

Create `src/lib/card-colors.ts`:

```ts
export const CARD_BG_COLORS = [ /* the existing 6 entries, verbatim */ ];

export function cardBgColor(id: string): string {
  // move the existing hash implementation from src/app/recipes/page.tsx
}
```

- `recipes/page.tsx`: delete local copies, import from the new module.
- `meal-plan/page.tsx`: delete local copy; replace position-based
  `CARD_BG_COLORS[index % …]` with `cardBgColor(entry.recipe.id)` — **the same
  recipe must get the same pastel on both the Recipes and Plan pages**, and the
  colour must not change when the list reorders.
- Add a doc comment declaring this the official decorative palette (closes
  `ux-review-handover.md` §4: literals are now the system, in exactly one
  place, with dark variants co-located).

### Tests (Phase 1)

- `tests/lib/card-colors.test.ts`: same id → same class; ids distribute across
  all 6 entries; output is always a member of `CARD_BG_COLORS`.
- Update any existing component tests asserting the old classes
  (`bg-green-600`, `bg-blue-600`, stone nav classes).

### Acceptance criteria

- `grep -rn "007AFF\|bg-blue-600\|bg-blue-500\|bg-green-600\|text-green-600\|bg-stone-50" src/` returns **zero** results (excluding `dark:`-paired status
  chips explicitly kept above — if any remain, justify each in the PR).
- App follows system dark mode with no dead `.dark` selector left in CSS.
- Same recipe shows the same card colour on Recipes and Plan pages.
- Docs updated: `docs/architecture.md` (palette location), `CLAUDE.md` Key
  Design Decisions gets a short "Single green accent via `--primary`; decorative
  pastels live in `src/lib/card-colors.ts`" entry.

---

## Phase 2 — Global toast + undo + mutation error handling

**Branch:** `feat/ux-toast-feedback` · **Risk:** medium · Depends on Phase 1.

### 2a. Toast component (in-house, no deps)

Create `src/components/Toast.tsx` exporting `ToastProvider` and `useToast`:

```ts
type ToastOptions = {
  action?: { label: string; onClick: () => void }; // e.g. Undo
  duration?: number;        // ms, default 4000; undo toasts pass 6000
  variant?: "default" | "error";
};
useToast(): { show(message: string, opts?: ToastOptions): void; dismiss(): void }
```

Behaviour spec:

- Renders ONE toast at a time; a new `show` replaces the current one
  (reset its timer).
- Position: `fixed left-4 right-4 z-50 bottom-[calc(4rem+env(safe-area-inset-bottom)+0.75rem)]`
  — bottom of screen, above the tab bar, thumb-reachable. (The existing grocery
  undo toast sits at the *top*; that placement dies in this phase.)
- Visual: match the existing toast (`bg-foreground text-background rounded-xl
  px-4 py-3 shadow-lg`, message left, bold action button right). `error`
  variant: `bg-destructive text-destructive-foreground`.
- Enter/exit: translate-y + opacity, 200ms, skipped under
  `prefers-reduced-motion` (gate with a `motion-reduce:transition-none` class).
- A11y: container has `aria-live="polite"` (render the live region always, the
  toast conditionally inside it, so announcements fire).
- Mount `ToastProvider` inside `src/components/Providers.tsx` so every page can
  call `useToast`.

### 2b. Shared undoable-delete hook

Create `src/lib/use-undoable-delete.ts`. It generalises the pattern already
working on the grocery page (optimistic hide → delayed commit → undo):

```ts
useUndoableDelete<T>(opts: {
  commit: (item: T) => Promise<void>;   // the real DELETE call
  onRevert: () => void;                  // revalidate SWR back to truth
  delayMs?: number;                      // default 6000
}): { remove(item: T, opts: { optimisticHide(): void; message: string }): void }
```

- `remove()` performs `optimisticHide()`, then shows a toast
  (`message`, action = Undo, duration = delay) and starts the commit timer.
- Undo: cancel timer, `onRevert()`.
- A second `remove()` while one is pending commits the first immediately
  (same as grocery's current behaviour).
- Commit on unmount if pending (grocery already does this — keep it).
- If `commit` rejects: `onRevert()` + error toast (see 2d).

### 2c. Apply D4 everywhere

| Action | Today | Target |
|---|---|---|
| Grocery item tap | bespoke top toast, 10s | `useUndoableDelete` + global toast, 6s (full row rework lands in Phase 6 — here, only swap the toast/timer plumbing) |
| Meal-plan entry trash (`removeEntry`) | instant, no recovery | undo toast via hook |
| Scheduled meal × (`removeSlot`) | instant, no recovery | undo toast via hook |
| Product delete (products page) | instant, no recovery, breaks FK'd shopping rows silently | **ActionSheet confirm** (catalog entity, D4), message explains it disappears from suggestions |
| Recipe delete | ActionSheet confirm | unchanged ✓ |

New i18n keys (all 4 locales): `common.undo` (move grocery's existing key),
`mealPlan.removedFromPlan` (`"Removed {name}"`), `schedule.removedMeal`,
`products.deleteConfirmTitle`, `products.deleteConfirmMessage`,
`products.deleteAction`.

### 2d. Stop swallowing mutation failures

Audit every `fetch` mutation (recipes detail: favourite/delete/duplicate/
add-to-plan · meal plan: add/remove/servings · schedule: add/remove slot ·
grocery: add/edit/delete · products: edit/delete · staple sheet: add ·
settings: locale · RecipeForm: save/import — import already handles errors).
For each: on `!res.ok` or thrown network error → show
`toast.show(tCommon("mutationError"), { variant: "error" })` and revalidate the
affected SWR key so optimistic state rolls back to server truth.

New key: `common.mutationError` — e.g. EN: `"That didn't save — check your
connection and try again."` (playful tone, all 4 locales).

Keep this mechanical: a tiny helper `src/lib/mutate-fetch.ts` wrapping
`fetch` + ok-check + error callback is acceptable if it stays under ~30 lines;
do not build an abstraction layer.

### Tests (Phase 2)

- `tests/components/Toast.test.tsx` (jsdom docblock): renders message; action
  button fires; auto-dismisses after duration (fake timers); replacement
  behaviour; `aria-live` present.
- `tests/lib/use-undoable-delete.test.ts`: commit fires after delay; undo
  cancels and reverts; second remove commits the first; rejection reverts.
- Update grocery page tests for the new toast position/wiring.
- Meal-plan page test: removing an entry shows undo; undo restores the row
  (mock fetch, fake timers).

### Acceptance criteria

- No destructive action in the app is instant-and-irreversible.
- Killing the network (mock) and tapping any save/delete produces a visible
  error toast and the UI returns to server truth.
- The top-of-screen grocery toast is gone.
- Docs: `docs/architecture.md` Key Directories table gets rows for `Toast.tsx`
  and `use-undoable-delete.ts`.

---

## Phase 3 — Accessibility & i18n-hygiene pass

**Branch:** `feat/ux-a11y-pass` · **Risk:** low-medium.

### 3a. Restore zoom

`src/app/layout.tsx` viewport: **delete** `maximumScale: 1` and
`userScalable: false`. (Modern iOS PWAs handle double-tap zoom fine; if the
user later reports input-focus auto-zoom annoyance, the correct fix is 16px
input font-size, not disabling zoom.)

### 3b. Make sheets real dialogs

In both `BottomSheet.tsx` and `ActionSheet.tsx`:

- **Focus trap:** on open, move focus into the panel (first focusable, else the
  panel itself with `tabIndex={-1}`); trap Tab/Shift-Tab inside (small keydown
  handler querying `a[href], button:not([disabled]), input, select, textarea,
  [tabindex]:not([tabindex="-1"])`). ~30 lines; implement once as
  `src/lib/use-focus-trap.ts` and use in both.
- **Focus restore:** remember `document.activeElement` on open, restore on
  close.
- **Labelling:** `aria-labelledby` pointing at the title element when `title`
  is set, else `aria-label` prop.
- ActionSheet's hardcoded `Cancel` → `tCommon("cancel")` (`useTranslations` —
  both components are already client components).

### 3c. Fix hardcoded strings & wrong labels (exhaustive list)

| File | Problem | Fix |
|---|---|---|
| `ActionSheet.tsx` | `Cancel` literal | `common.cancel` |
| `SwipeableRow.tsx` | `Edit` literal | new `common.edit` key, passed as prop or translated in-component |
| `schedule/page.tsx` | `Today` badge literal | new `schedule.today` key |
| `schedule/page.tsx` | aria `"Remove"`, `"Close slot picker"` | keys `schedule.removeMeal`, `common.close` |
| `meal-plan/page.tsx` | aria `"Decrease servings"`, `"Increase servings"`, `"Remove from plan"` | keys `common.decreaseServings`, `common.increaseServings`, `mealPlan.removeFromPlan` |
| `recipes/[id]/page.tsx` | − button announces `common.cancel`, + announces `common.add` (**wrong**) | `common.decreaseServings` / `common.increaseServings` |
| `grocery-list/page.tsx` | aria `"Manage my items"` | key `grocery.manageItems` |
| `products/page.tsx` | aria `` `Edit ${name}` ``, `` `Delete ${name}` `` | keys with `{name}` interpolation |

### 3d. Locale-aware dates

`schedule/page.tsx` (`formatDay`, `formatWeekRange`) and the same helpers in
`StartNewWeekWizard.tsx` (this is the one sanctioned wizard touch) hardcode
`"en-GB"`. Replace with the active locale: `import { useLocale } from
"next-intl"` and pass it to `toLocaleDateString(locale, …)`. French users
currently see "Mon 15 Jun" inside an otherwise-French UI.

### 3e. Focus visibility + hit targets

- `globals.css` `@layer base`: add `:focus-visible { outline: 2px solid
  hsl(var(--ring)); outline-offset: 2px; }` so the FAB, nav tabs, custom row
  buttons, and steppers all get a visible keyboard indicator. Where shadcn
  components already render their own ring, double indication is acceptable —
  do not chase per-component suppression.
- Bring every interactive element to a ≥44×44px hit area **without changing
  visual density**, by padding + negative margin. Known offenders:
  - meal-plan steppers `w-7 h-7` → keep the 28px visual circle, wrap each in a
    flex container or add `p-2 -m-2` to the button;
  - meal-plan trash, schedule ×, products pencil/trash (`p-1` + 14–16px icon)
    → `p-2.5 -m-1.5` (icon size unchanged);
  - recipe-detail header star/⋯/back are `p-1.5` + ~20px icon → `p-2.5 -m-1`.

### Tests (Phase 3)

- `tests/components/BottomSheet.test.tsx` / extend existing: focus moves into
  sheet on open; Tab wraps; focus returns to trigger on close; Escape still
  closes; `aria-labelledby` resolves.
- Assert translated strings replaced literals (e.g. ActionSheet renders
  `common.cancel` from the mocked messages).
- Date helper test: same date renders differently under `fr` vs `en` locale.

### Acceptance criteria

- Pinch-zoom works on device.
- Keyboard-only: every screen can be operated (open sheet → tab is trapped →
  Escape closes → focus restored).
- `grep -rn '"Today"\|>Cancel<\|>Edit<\|aria-label="[A-Z]' src/` → no
  user-visible English literals (review hits manually).
- Docs: `docs/testing.md` gains a short "focus-trap testing" snippet if you
  needed any non-obvious technique.

---

## Phase 4 — Consistent loading / empty / error states

**Branch:** `feat/ux-state-consistency` · **Risk:** low · Depends on Phases 1–2.

### 4a. Shared `EmptyState` component

Create `src/components/EmptyState.tsx`:

```ts
type Props = {
  pose: CocottePose;            // reuse the pose type from Cocotte
  title: string;
  subtext?: string;
  action?: { label: string; href?: string; onClick?: () => void };
};
```

Visual: exactly the pattern already repeated on recipes/meal-plan/grocery
(`flex flex-col items-center gap-3 py-16 text-center`, Cocotte size 140, bold
title, muted subtext, pill CTA — CTA now `bg-primary text-primary-foreground
rounded-full px-5 py-2.5 text-sm font-semibold active:scale-95`). Replace the
three inline copies with it.

### 4b. Bring Schedule and Products up to standard

- **Schedule:** replace both 📅-emoji states with `EmptyState`, and **split the
  two conditions that currently show identical copy**:
  - no active week → pose `shrug`, new keys `schedule.noWeekTitle`/`noWeekHint`
    ("No week planned yet" / "Start a new week from the Plan tab"), action →
    `href: "/meal-plan"`, label = existing `mealPlan.newWeek` key;
  - week exists but no meal-plan entries → pose `wave`, new keys
    `schedule.noEntriesTitle`/`noEntriesHint`, action → `href: "/recipes"`.
  - Replace the plain-text loading `<p>` with `<LoadingState message={…} />`
    (new key `schedule.loading`, Cocotte-tone).
- **Products:** `LoadingState` for loading (key `products.loading`); empty →
  `EmptyState` pose `hold-basket`, explaining items added from the grocery
  list appear here.

### 4c. Error states everywhere

Recipes already renders a Cocotte `shrug` error block. Extract that exact
block into usage of `EmptyState` (pose `shrug`, `common.errorTitle`,
`common.errorSubtext`) and render it on SWR `error` for: meal plan, schedule,
grocery list, products. (These pages currently ignore `error` and show their
empty state instead — a network failure must not look like "you have no
recipes".)

### 4d. Schedule's add-slot modal → `BottomSheet`

Replace the hand-rolled fixed-overlay slot picker in `schedule/page.tsx` with
the standard `BottomSheet` (title = `formatDay(slotDate) · ☀️/🌙 lunch|dinner`).
Content is the existing picker markup unchanged. Deleting the bespoke
backdrop/panel removes ~25 lines and gains animation, drag-dismiss, scroll
lock, Escape, and the Phase 3 focus trap for free.

### Tests (Phase 4)

- `tests/components/EmptyState.test.tsx`: renders title/subtext; action as
  link vs button; no action → no CTA.
- Schedule page tests: the two empty variants render distinct copy; SWR error
  → error state (mock fetcher rejection); slot picker opens in a dialog role.
- Products page: loading shows Cocotte; error state renders.

### Acceptance criteria

- Zero plain-text "Loading…" paragraphs left in `src/app/**`.
- Zero emoji-only empty states.
- Every SWR-fetching page distinguishes loading / error / empty / data.
- `grep -n "fixed inset-0" src/app/schedule/page.tsx` → no results.
- Docs: architecture table row for `EmptyState.tsx`.

---

## Phase 5 — Form safety & input ergonomics

**Branch:** `feat/ux-form-safety` · **Risk:** medium (RecipeForm wiring).

### 5a. Unsaved-changes guard (D7)

- `RecipeForm` tracks dirtiness: snapshot `JSON.stringify({form, tagsInput})`
  on mount **and after an import populates the form** (an imported-but-unsaved
  recipe is dirty: re-snapshot only the *empty* baseline, i.e. baseline is the
  initial state, so import → dirty — that is the desired behaviour, an
  AI-imported recipe is the most expensive thing to lose). Expose
  `onDirtyChange?: (dirty: boolean) => void`, called when crossing the
  boundary.
- In `recipes/page.tsx` (new-recipe sheet) and `recipes/[id]/page.tsx` (edit
  sheet): hold `formDirty` state; the sheet's `onClose` becomes: if dirty →
  open an `ActionSheet` (`title: recipeForm.discardTitle`, message:
  `recipeForm.discardMessage`, destructive action `recipeForm.discardAction`
  "Discard changes", cancel keeps editing — closing the recipe sheet only on
  discard). If clean → close immediately.
- Escape key inside `BottomSheet` follows the same path automatically since it
  calls `onClose`.
- Successful save resets dirty before closing (no false prompt).

### 5b. Input semantics sweep

| Field | Change |
|---|---|
| All quantity inputs (RecipeForm, grocery add/edit, StapleCheckinSheet) | add `inputMode="decimal"` |
| Servings (RecipeForm) | add `inputMode="numeric"` |
| Search fields (recipes, meal plan) | add clear-× button inside the input, shown when non-empty (lucide `X`, 44px hit area, aria-label `common.clearSearch` — new key); `enterKeyHint="search"` |
| Grocery add-item name | `enterKeyHint="done"` (Enter already submits) |
| Signin password | show/hide toggle (lucide `Eye`/`EyeOff`, `aria-label` keys `auth.showPassword`/`auth.hidePassword`); keep `autoComplete` values |
| Signin email | `autoFocus`, `inputMode="email"` |

### 5c. Settings: identity context

Above the language picker, show who is signed in (avatar if
`session.user.image`, else nothing; name + email, muted) using
`authClient.useSession()` — professional apps never hide *which account* the
destructive "Sign out" button applies to.

### Tests (Phase 5)

- RecipeForm: typing → `onDirtyChange(true)`; reverting content does **not**
  need to flip back (one-way latch is acceptable — assert whichever you
  implement); import marks dirty.
- Recipes page: dirty form + backdrop close → discard ActionSheet appears;
  "Discard" closes; cancel keeps sheet open.
- Search clear button clears value and refocuses input.
- Password toggle flips `type` between `password`/`text`.

### Acceptance criteria

- Impossible to lose a dirty recipe form with a single gesture.
- iOS shows numeric/decimal keypads on all quantity fields (verify on preview).
- Docs: this introduces no API/schema changes — PR states
  `Docs: not required — UI-only ergonomics; no behaviour contract changed`
  *if* you change no docs; otherwise update what you touched.

---

## Phase 6 — Grocery check affordance (D5)

**Branch:** `feat/ux-grocery-check` · **Risk:** medium · Depends on Phase 2 ·
**Preview deploy required** (gesture feel needs a real thumb).

Current row = invisible tap-to-delete. Target = visible check-off, like Bring/
AnyList:

1. Add a leading checkbox circle to every row: `w-[22px] h-[22px] rounded-full
   border-2 border-muted-foreground/40 shrink-0`.
2. Tap anywhere on the row → *checked* state renders synchronously: circle
   fills `bg-primary border-primary` with a white lucide `Check` (14px), item
   name gets `line-through text-muted-foreground`, quantity dims.
3. After **400ms** (pause long enough to see the check land), the existing
   optimistic-removal + undo-toast path from Phase 2 runs. Under
   `prefers-reduced-motion`, skip nothing — the delay is feedback, not
   decoration; keep it.
4. Undo restores the row unchecked.
5. Row button `aria-label`: new key `grocery.markBought` (`"Mark {name} as
   bought"`). Keep `haptic()` on tap if available (matches recipe-detail
   favourite).
6. The swipe-to-edit reveal on user products is unchanged and must still work
   with the new row layout (checkbox sits inside the translating row content).

Implementation note: hold a `checkingIds: Set<number>` state for rows in the
400ms window; ignore re-taps while checking.

### Tests (Phase 6)

Fake timers: tap → row shows check + strikethrough, item still in DOM; after
400ms → removal path fires (DELETE scheduled, undo toast shown); undo →
row back, unchecked; double-tap during window doesn't double-delete.

### Acceptance criteria

- A first-time user can tell, without tapping, that grocery rows are
  checkable.
- Checking feels instant; nothing vanishes without the check animating first.
- Docs: update the grocery section in `docs/architecture.md` (one paragraph).

---

## Phase 7 — Visual finish pass

**Branch:** `feat/ux-visual-finish` · **Risk:** low · **Preview deploy
required.**

### 7a. One icon language (lucide only)

- Recipe detail favourite: replace text `★`/`☆` with lucide `Star`
  (`fill="currentColor"` + `text-amber-400` when favourited, outline
  `text-muted-foreground` when not). Keep the `animate-star-pop` class — note
  the `SVGAnimatedString.baseVal` test gotcha now applies to it.
- Recipe cards: same treatment for the corner star (16px).
- Recipes "★ Favourites" filter button: lucide `Star` (12px, filled when
  active) + label instead of the text glyph.
- Recipe-detail step numbers: replace `①②③…` (`STEP_NUMBERS` array and
  `stepLabel`) with a rendered badge:
  `<span className="shrink-0 w-6 h-6 mt-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>`
  — works for any step count, renders identically on every platform; delete
  the unicode array.
- Lunch ☀️ / dinner 🌙 emoji on schedule, category emoji, ingredient emoji,
  and Cocotte stay — they are content/brand, not UI chrome. The line is:
  *controls* use lucide; *content decoration* may use emoji.

### 7b. `NativeSelect` component

Create `src/components/ui/native-select.tsx`: a styled `<select>` wrapper
matching `Input` (same height, border, radius, focus ring) with a lucide
`ChevronDown` positioned right (`pointer-events-none`) and `appearance-none`.
Replace the five raw `<select className="w-full border border-input …">`
usages: grocery add sheet, grocery edit sheet, products edit sheet, settings
language, signin language, RecipeForm ingredient category. Keep them native
`<select>` under the hood — native pickers are the right mobile behaviour; this
is purely visual unification.

### 7c. Deduplicate locale labels

Move `LOCALE_LABELS` into `src/i18n/config.ts` (exported const beside
`SUPPORTED_LOCALES`); import in signin + settings; delete both local copies.

### 7d. Radius & spacing audit (light touch)

Declared scale — **controls** (inputs, selects, buttons): `rounded-md`/`lg`
per shadcn defaults · **cards & list containers**: `rounded-xl` · **sheets,
FABs, pills**: `rounded-2xl`/`rounded-full`. Sweep for stragglers (the
import-option rows in RecipeForm use `rounded-2xl` on card-like rows →
`rounded-xl`; the URL-import panel uses `rounded-lg` → `rounded-xl`). Don't
chase pixel-perfection; fix only class-level inconsistencies you can name.

### Tests (Phase 7)

- NativeSelect: renders options, fires onChange, chevron `aria-hidden`.
- Recipe detail: favourite toggles `Star` fill state (assert via class on the
  svg — `.baseVal`!); instructions render `1`, `2`, … badges for n steps
  including n > 20 (the old unicode array capped at 20).

### Acceptance criteria

- No text-glyph stars or enclosed-unicode numerals in any component.
- All selects visually match inputs in both colour schemes.
- `grep -rn "LOCALE_LABELS" src/app` → only imports, no definitions.

---

## Phase 8 (optional — propose to user before starting) — Capability upgrades

Not required to hit the professional bar; listed so they aren't reinvented ad
hoc. Each needs its own user-approved proposal:

1. **In-place servings scaler on recipe detail** — stepper next to the
   servings line scaling displayed quantities client-side (nice fraction
   rounding: 0.25 steps).
2. **Cook mode** — full-screen step-by-step with `navigator.wakeLock` so the
   phone stays awake while cooking; step check-off.
3. **Offline grace** — `navigator.onLine` listener + cached-data banner
   ("You're offline — showing your last list"); the grocery list is the
   killer use case (supermarket basements).
4. **Desktop layout pass** — the bottom tab bar on ≥1024px viewports reads as
   a stretched phone app; a left rail would fix it. Explicitly deferred.
5. **Wizard UX review** — `StartNewWeekWizard.tsx` dedicated audit (flagged in
   `ux-review-handover.md`, still outstanding).

---

## Final QA script (run after Phase 7, before declaring done)

On the production preview, on a real phone where possible:

1. **Walkthrough:** sign up → import recipe via photo → edit it → add to plan
   → staple check-in → start new week wizard → schedule meals → shop the
   grocery list to empty → cheer state. No dead ends, every action gives
   feedback.
2. **Dark mode sweep:** every page, system dark. No unreadable text, no light
   flashes.
3. **Keyboard-only** (desktop browser): full walkthrough; focus always visible,
   sheets trap and restore focus.
4. **Screen reader spot check** (VoiceOver): tab bar, recipe card, grocery row,
   one sheet. Labels meaningful, no raw English in a French session.
5. **French locale session:** zero English strings anywhere, including dates
   and toasts.
6. **Stress:** 320px-wide viewport; browser font scaling 130%; airplane mode
   mid-session → error toasts, no silent data loss, no crash.
7. **Feel:** pinch-zoom works; pull-to-refresh, swipe-edit, drag-dismiss all
   still work; no scroll jank on the grocery list with 50+ items.

Log results in the final PR. Anything failing gets fixed before the plan is
called complete.
