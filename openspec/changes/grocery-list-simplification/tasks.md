## 1. Schema & Session API

- [ ] 1.1 Remove `checkedKeys String[]` from `ShoppingSession` in `prisma/schema.prisma`
- [ ] 1.2 Run `npx prisma db push` and `npx prisma generate`
- [ ] 1.3 Remove `checkedKeys` from GET response and PUT handler in `src/app/api/shopping-session/route.ts`
- [ ] 1.4 Update `SessionState` type in grocery list page and any other consumers

## 2. Delta Helper

- [ ] 2.1 Create `src/lib/grocery-delta.ts` — `applyGroceryDelta(userId, ingredients, factor, tx)`: normalizes units, skips staples, merges/subtracts into `ShoppingListItem` rows, deletes rows at ≤ 0
- [ ] 2.2 Write unit tests for `applyGroceryDelta` in `tests/lib/grocery-delta.test.ts`: positive factor adds/merges, negative factor subtracts, row deleted at 0, staple ingredients skipped, unit normalization applied

## 3. Meal Plan API — Delta Writes

- [ ] 3.1 `POST /api/meal-plan` — after creating `MealPlanEntry`, call `applyGroceryDelta` (factor = `targetServings / recipe.servings`) inside transaction; fetch recipe ingredients inside tx
- [ ] 3.2 `PATCH /api/meal-plan/[id]` — on servings change, call `applyGroceryDelta` with `factor = (newServings - oldServings) / recipe.servings`
- [ ] 3.3 `DELETE /api/meal-plan/[id]` — call `applyGroceryDelta` with `factor = -(targetServings / recipe.servings)` before deleting entry
- [ ] 3.4 Update `POST /api/meal-plan/new-week` — new entries call `applyGroceryDelta`; remove `runGroceryTransition` from `StartNewWeekWizard.tsx`; consumed portions apply no delta
- [ ] 3.5 Update API tests for POST, PATCH, DELETE meal-plan routes: verify delta calls; remove any tests that assert on the derived grocery-list endpoint

## 4. Delete Derived Grocery List

- [ ] 4.1 Delete `src/app/api/grocery-list/route.ts`
- [ ] 4.2 Delete or archive `aggregateGroceryList` from `src/lib/grocery-list.ts` (keep `normalizeUnit` — still used by delta helper)
- [ ] 4.3 Delete associated tests in `tests/api/` and `tests/lib/` that test the derived endpoint/function

## 5. Grocery List Page

- [ ] 5.1 Remove the `/api/grocery-list` SWR hook and `mealPlanItems` state
- [ ] 5.2 Remove `checkedKeys`, `sessionSyncTimer`, `syncCheckedKeys`, `needsStapleReview`, `setStapleReview`, `showStapleReviewSheet` state and logic
- [ ] 5.3 Remove `/api/shopping-session` SWR hook (no longer needed on this page)
- [ ] 5.4 Remove staple review banner JSX and `StapleCheckinSheet` usage from this page
- [ ] 5.5 Update `toggleItem` to single branch: all taps trigger 10s-undo delete (no `checkedKeys` branch)
- [ ] 5.6 Simplify `itemKey` — all items are shopping list items; key = `sl_${item.id}`
- [ ] 5.7 Remove `displayMpItems` filter and dual-stream concatenation; `allItems = slItems`
- [ ] 5.8 Update grocery list component tests: remove checkedKeys tests, remove derived-item tests, add tests verifying single-stream behaviour and uniform tap-to-remove

## 6. Meal Plan Page — "Ready to Cook"

- [ ] 6.1 Fetch `shoppingListItems` from `/api/shopping-list` on the meal plan page (SWR)
- [ ] 6.2 Rewrite `isReadyToCook` to check that all non-staple `productId`s for the entry are absent from `shoppingProductIds` (a `Set<number>` derived from `shoppingListItems`)
- [ ] 6.3 Remove `checkedKeys`/`checkedNames` derivation from `sessionData`
- [ ] 6.4 Update meal plan component tests for the new ready-to-cook logic

## 7. Wizard Cleanup

- [ ] 7.1 Remove `checkedKeys` prop from `StartNewWeekWizard` and its call site in `meal-plan/page.tsx`
- [ ] 7.2 Remove `runGroceryTransition` function from `StartNewWeekWizard.tsx`
- [ ] 7.3 Verify wizard step 4 new-recipe additions trigger the meal plan POST (which now applies the delta) — no wizard-side grocery logic needed
- [ ] 7.4 Update wizard tests to remove `checkedKeys` and `runGroceryTransition` assertions

## 8. Pre-PR

- [ ] 8.1 Run `npm test` — all tests pass
- [ ] 8.2 Run `npx tsc --noEmit` — no type errors
- [ ] 8.3 Run `npm run lint` — no errors
- [ ] 8.4 Run `/pre-pr` checklist
