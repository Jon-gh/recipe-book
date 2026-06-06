## Why

The grocery list currently mixes two incompatible object types: **derived lines** (computed live from `MealPlanEntry → RecipeIngredient → Product`) and **persistent rows** (`ShoppingListItem`). This produces visible inconsistency:

- Tapping a derived line strikes it through (suppresses via `checkedKeys`); tapping a persistent row deletes it. One page, two behaviours.
- Derived and persistent lines with the same ingredient never merge — "pasta" from a recipe and manually-added "pasta" appear twice.
- The new-week wizard (`runGroceryTransition`) silently writes persistent rows for already-checked ingredients, making the wizard path behaviorally different from the plain "add to meal plan" path.
- `checkedKeys` exists purely as a suppression side-table — a structural necessity of the derived model, not a feature.

The root cause: the grocery list is a **live view of the meal plan**, requiring a separate suppression layer to make tapped items appear gone. Materializing removes the need for that layer.

## What Changes

- **Grocery list becomes a pure `ShoppingListItem` stream** — one object type, one tap behaviour (remove + 10s undo), no dual-stream concatenation.
- **Meal-plan actions apply stateless quantity deltas** to `ShoppingListItem` rows at write time: add-recipe, servings ±, remove-recipe each merge or subtract from the list by `productId + unit`. No stored recipe-to-row link needed.
- **`checkedKeys`, `runGroceryTransition`, the derived `/api/grocery-list` endpoint, and the staple-review banner are deleted.**
- **"Ready to cook"** on the meal plan: a recipe is ready when none of its non-staple `productId`s remain on the grocery list — a membership test, no quantity math.
- **Week reset (wizard)**: list is never auto-cleared — rows persist until tapped. Consumed-portion accounting (wizard step 1) applies no grocery delta. New recipes added in wizard step 4 apply the same add-delta as a normal add. Staple check-in (step 6) is unchanged.
- **`ShoppingSession`**: `checkedKeys` field removed; `needsStapleReview` and `weekStart`/`weekEnd` stay.

## Non-Goals

- No change to recipe import, recipe editing, or the schedule page.
- No change to staple categories or the staple check-in flow itself (step 6 of wizard + post-add sheet on recipe detail).
- No provenance tracking (which recipe contributed which row) — deliberately stateless.

## Capabilities

### Modified Capabilities
- `grocery-list`: Single `ShoppingListItem` stream. Tap = remove (10s undo) everywhere. Add-item sheet unchanged.
- `meal-plan`: Servings ± and remove-recipe now apply grocery deltas. Add-recipe triggers delta write.
- `shopping-session`: `checkedKeys` removed.
- `ready-to-cook`: Membership test against grocery list productIds, not checkedKeys names.

### Deleted Capabilities
- Derived grocery list (`/api/grocery-list` route, `aggregateGroceryList` at read time).
- `checkedKeys` suppression state and sync.
- `runGroceryTransition` helper (wizard grocery carry-over).
- Staple review banner + `needsStapleReview` write from wizard (banner already exists; staple check-in flow that populates it is unchanged, but the banner itself may be reconsidered as it now has less need to exist).

## Impact

- `prisma/schema.prisma` — remove `checkedKeys` from `ShoppingSession`
- `src/app/api/shopping-session/route.ts` — remove `checkedKeys` field
- `src/app/api/grocery-list/route.ts` — **delete**
- `src/lib/grocery-list.ts` — `aggregateGroceryList` no longer called at read-time; `normalizeUnit` kept (reused by delta helper)
- `src/lib/grocery-delta.ts` — **new** helper: `applyGroceryDelta(userId, ingredients, factor, prisma)` — merges/subtracts scaled quantities into `ShoppingListItem`
- `src/app/api/meal-plan/route.ts` (POST) — call delta helper on add
- `src/app/api/meal-plan/[id]/route.ts` (PATCH servings, DELETE) — call delta helper
- `src/app/api/meal-plan/new-week/route.ts` — new entries call delta helper; consumed portions do not; existing structure otherwise unchanged
- `src/app/grocery-list/page.tsx` — remove dual-stream, `checkedKeys`, `sessionSyncTimer`, staple-review banner; single SWR on `/api/shopping-list`; uniform tap = remove
- `src/app/meal-plan/page.tsx` — `isReadyToCook` switches to productId membership test against shopping list
- `src/components/StartNewWeekWizard.tsx` — remove `checkedKeys` prop + `runGroceryTransition`; new-recipe add calls delta via API
- Tests: delete grocery-list derived-endpoint tests; update meal-plan API tests for delta calls; update grocery page component tests; update wizard tests
