## Context

The grocery list currently shows meal-plan staple ingredients hidden behind a "Show staples" toggle. The toggle is confusing (stale checked-state persists across weeks, counts include already-hidden items, quantities are recipe-scale not purchase-scale). The fix is to move staple decisions to planning time: immediately after adding a recipe to the meal plan, the user sees which staples are involved and picks which ones to actually buy this week. Selected staples are added to the shopping list as regular items with a user-supplied purchase quantity.

Current `ShoppingSession` has `showStaples: Boolean`. That field is removed and replaced with `needsStapleReview: Boolean`.

## Goals / Non-Goals

**Goals:**
- Remove the "Show staples" toggle from the grocery list
- Surface a staple check-in UI at planning time (recipe detail + wizard)
- Staples added via check-in appear on the grocery list as regular shopping list items (not as recipe ingredients)
- Unreviewed staples are flagged so the grocery list can show a soft reminder
- Purchase quantity chosen by the user in the check-in UI (pre-filled from `Product.defaultUnit` / `Product.defaultQuantity` where set)

**Non-Goals:**
- Automatically saving user-supplied purchase quantities back to `Product.defaultQuantity` (deferred — per-product defaults are a separate feature)
- Showing staples from previously-added recipes during a mid-week wizard run (only wizard-run's new recipes)
- Migrating or clearing stale `checkedKeys` for staple items (handled naturally: staple items no longer appear on the grocery list as meal-plan items, so their keys are irrelevant)

## Decisions

### D1 — Staple items are excluded from the grocery list at render time, not at API level
The `/api/grocery-list` response still returns all meal-plan ingredients including staples. The grocery list page filters them out client-side (`categoryIsStaple(i.category) && i.shoppingListId == null`). Keeps the API simple and avoids a breaking change.

### D2 — Check-in adds to shopping list, not a new table
Selected staples go through `POST /api/shopping-list` with a user-supplied quantity and unit. This reuses the existing shopping list display logic (items with `shoppingListId` always show on the grocery list regardless of category). No new data model needed beyond the `ShoppingSession` field change.

### D3 — `needsStapleReview` replaces `showStaples` on ShoppingSession
`showStaples` is no longer meaningful. `needsStapleReview` (default `false`) is set to `true` when the user taps "Review Later" in the check-in sheet. Reset to `false` when the check-in sheet is completed (user taps Done) or dismissed from the grocery list banner. Schema change is non-destructive: `npx prisma db push` adds the column with default `false`; the old `showStaples` column can be dropped in the same migration.

### D4 — Wizard step numbering: insert new step 6, shift old step 6 → 7
The wizard currently has steps 1–6 (step 6 is "Confirm"). The new "Check your pantry" step is inserted between step 5 (schedule) and the confirm step. `total` prop on `ProgressBar` changes from 6 to 7. Only staples from the recipes being added *in this wizard run* are shown (new recipes collected in step 4 state).

### D5 — Check-in sheet on recipe detail: shown once per add, skippable
After `handleAddToPlan` resolves, if the recipe has any ingredients in staple categories, a bottom sheet is shown. "Done" closes it. "Review Later" closes it and calls `PUT /api/shopping-session` with `{ needsStapleReview: true }`. If the recipe has no staple ingredients, nothing extra is shown.

### D6 — Grocery list banner is soft and dismissible
The banner reads "You have staples to check — [Review] [Dismiss]". "Review" opens the same staple check-in sheet (sourced from all current meal-plan recipes' staple ingredients that aren't already in the shopping list). "Dismiss" calls `PUT /api/shopping-session` with `{ needsStapleReview: false }` without adding anything.

## Risks / Trade-offs

- **Staples already in shopping list not de-duped in check-in UI** → The check-in sheet should filter out staple ingredients already present in the shopping list to avoid double-adding. Derive this client-side by comparing ingredient names against current `shoppingListItems`.
- **System products have read-only defaultUnit/defaultQuantity** → Purchase quantity is always user-entered in this version; no save-back. Low risk — user types a quantity once.
- **Schema migration removes showStaples** → Existing sessions lose their `showStaples` preference on deploy, but since the toggle is removed this has no user-visible effect. Safe to drop in the same `db push`.
- **Wizard step count change** → `ProgressBar` total hardcoded at 6. Must update to 7. Low risk, easy to miss in review.

## Migration Plan

1. `npx prisma db push` — adds `needsStapleReview` (default false), drops `showStaples`
2. Deploy — no data backfill needed; all existing sessions get `needsStapleReview = false`
3. Rollback — revert code + re-run `db push` to restore `showStaples`; no data loss (both fields are flags)
