# Design: Grocery List Simplification

## Core Abstraction: The Delta Accumulator

The grocery list is a bag of `(productId, quantity, unit)` rows. Every meal-plan write applies a quantity delta. The delta helper is the single place all scale+merge logic lives.

```
ACTION                        DELTA
─────────────────────────     ─────────────────────────────────────────────────
add recipe @ S servings       + (S / recipe.servings) × ingredient.quantity per row
servings +1                   + (1 / recipe.servings) × ingredient.quantity per row
servings -1                   − (1 / recipe.servings) × ingredient.quantity per row
remove recipe                 − (targetServings / recipe.servings) × ingredient.quantity per row
wizard: add new recipe        same as add recipe
wizard: consumed portions     NO delta (meal-plan bookkeeping only)
tap grocery row               DELETE ShoppingListItem (10s undo)
```

**Merge key**: `productId + normalizedUnit` (same logic as today's `aggregateGroceryList`).  
**Floor**: quantity never goes below 0; if a subtraction would reach 0 or below, the row is deleted.  
**Staple categories**: delta helper skips ingredients in staple categories — they are handled by the existing staple check-in flow.

## Delta Helper: `src/lib/grocery-delta.ts`

```typescript
export async function applyGroceryDelta(
  userId: string,
  ingredients: { productId: number; category: string; quantity: number; unit: string }[],
  factor: number,   // targetServings / recipe.servings — negative for subtract
  tx: PrismaTransactionClient
): Promise<void>
```

- Iterates ingredients, skips staples (`categoryIsStaple`), normalizes unit via existing `normalizeUnit`.
- For each non-staple ingredient:
  - `delta = Math.round(ingredient.quantity * factor * unitFactor * 1000) / 1000`
  - Looks up `ShoppingListItem` where `{ userId, productId, unit: canonical }`.
  - If row exists: `newQty = existing.quantity + delta`; if `newQty <= 0` → delete row; else → update quantity.
  - If row doesn't exist and `delta > 0`: create row.
  - If row doesn't exist and `delta <= 0`: no-op.
- Runs inside caller's transaction (Prisma transaction is passed in).

## API Changes

### POST `/api/meal-plan`
After creating the `MealPlanEntry`, call `applyGroceryDelta` with `factor = targetServings / recipe.servings` (positive).  
Requires fetching the recipe's ingredients inside the transaction.

### PATCH `/api/meal-plan/[id]`
On servings change from `oldServings` to `newServings`:  
`factor = (newServings - oldServings) / recipe.servings`  
Positive = add, negative = subtract.

### DELETE `/api/meal-plan/[id]`
`factor = -(entry.targetServings / recipe.servings)` (full subtraction).

### POST `/api/meal-plan/new-week`
- Consumed entries: no grocery delta. Meal plan update/delete logic unchanged.
- New entries (step 4): same as POST `/api/meal-plan` — `applyGroceryDelta` with positive factor.
- Remove `runGroceryTransition` call entirely.

### DELETE `/api/grocery-list/route.ts`
Entire file deleted. Route no longer exists.

## Grocery List Page

**Before**: `allItems = [...mpItems (derived), ...slItems (persistent)]`  
**After**: `allItems = slItems` — single SWR on `/api/shopping-list`.

- Remove: `mealPlanItems` SWR, `sessionData` SWR, `checkedKeys` state, `sessionSyncTimer`, `syncCheckedKeys`, `needsStapleReview` state, `setStapleReview`, `showStapleReviewSheet`, staple review banner JSX, `StapleCheckinSheet` import (no longer needed here — still used on recipe detail page).
- `toggleItem`: single branch — remove `shoppingListId` vs key check; all items are shopping list items, all taps trigger the 10s-undo delete flow.
- `itemKey`: simplified — always `sl_${item.id}`.

## "Ready to Cook"

`isReadyToCook` in `src/app/meal-plan/page.tsx` currently checks whether all non-staple ingredient names appear in `checkedKeys` (derived from session).

**New**: checks whether all non-staple ingredient `productId`s are absent from `shoppingListItems`.  
`shoppingListItems` is already fetched on the meal plan page (needed for the staple check-in sheet). No new data fetch required.

```typescript
function isReadyToCook(entry: MealPlanEntry, shoppingProductIds: Set<number>): boolean {
  const nonStaple = entry.recipe.ingredients.filter(
    (i) => !categoryIsStaple(i.product?.category ?? "other")
  );
  if (nonStaple.length === 0) return false;
  return nonStaple.every((i) => !shoppingProductIds.has(i.product.id));
}
```

## ShoppingSession Schema Change

Remove `checkedKeys String[]` from `ShoppingSession`. Keep `needsStapleReview`, `weekStart`, `weekEnd`.

Migration: `npx prisma db push` (non-destructive column drop — Postgres allows this).

## Known Trade-Off: No Live Rescaling

Once ingredients are materialized, they are frozen at add-time quantities. Editing a recipe's servings later adjusts via delta, but does not "re-derive" from the current recipe. Example: if the recipe itself is edited (ingredient list changed), the grocery list is not retroactively updated. This is accepted — the grocery list represents shopping intent at a point in time, not a mirror of recipes.

## Known Trade-Off: No Auto-Clear on Week Reset

The grocery list is never automatically cleared. Rows persist until tapped. Users who want a fresh list at week-start simply work through it during shopping. This matches real-world shopping behaviour (items you didn't buy this week stay on next week's list).
