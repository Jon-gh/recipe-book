## 1. Schema & API

- [x] 1.1 Update `prisma/schema.prisma`: remove `showStaples` from `ShoppingSession`, add `needsStapleReview Boolean @default(false)`
- [x] 1.2 Run `npx prisma db push` and `npx prisma generate` to apply the schema change
- [x] 1.3 Update `src/app/api/shopping-session/route.ts`: replace `showStaples` with `needsStapleReview` in GET response and PUT handler

## 2. Shared StapleCheckin Component

- [x] 2.1 Create `src/components/StapleCheckinSheet.tsx` — bottom sheet that accepts a list of staple ingredients and current shopping list items; renders each staple with quantity + unit inputs pre-filled from `Product.defaultQuantity`/`Product.defaultUnit`; emits added items via callback; has "Done" and "Review Later" actions
- [x] 2.2 Write tests for `StapleCheckinSheet` in `tests/components/StapleCheckinSheet.test.tsx`: renders staple list, filters out already-in-shopping-list items, calls POST on add, calls onDone/onDefer callbacks correctly

## 3. Grocery List Page

- [x] 3.1 Remove `showStaples` state, `stapleCount`, and the toggle button from `src/app/grocery-list/page.tsx`
- [x] 3.2 Update `visibleGroups` logic: filter out meal plan items in staple categories (`categoryIsStaple(i.category) && i.shoppingListId == null`); shopping list items in staple categories still show
- [x] 3.3 Remove the `(g.isStaple && showStaples)` bypass from the checked-item filter (no longer needed)
- [x] 3.4 Replace `SessionState.showStaples` with `needsStapleReview` in the local type and session sync logic
- [x] 3.5 Add staple review banner: when `needsStapleReview = true`, show a banner with "Review" (opens `StapleCheckinSheet` sourced from meal plan staples not in shopping list) and "Dismiss" (sets `needsStapleReview = false`)
- [x] 3.6 Update grocery list component tests: remove staple toggle tests, add test for staple meal-plan items not appearing, add test for shopping-list staple items appearing, add banner tests

## 4. Recipe Detail — Post-Add Check-in

- [x] 4.1 In `src/app/recipes/[id]/page.tsx`, after `handleAddToPlan` resolves, check if the recipe has any staple ingredients not already in `shoppingListItems` SWR data
- [x] 4.2 If staples exist: open `StapleCheckinSheet` with those ingredients
- [x] 4.3 Wire `onDefer` callback to `PUT /api/shopping-session` with `{ needsStapleReview: true }`
- [x] 4.4 Wire `onDone` callback to close the sheet (no session update needed)
- [x] 4.5 Write component tests for the post-add check-in flow: no sheet when recipe has no staples, sheet shown when staples exist, defer sets session flag

## 5. Wizard — Check Your Pantry Step

- [x] 5.1 In `StartNewWeekWizard.tsx`, update `ProgressBar` `total` from 6 to 7
- [x] 5.2 Update the step type from `1 | 2 | 3 | 4 | 5 | 6` to `1 | 2 | 3 | 4 | 5 | 6 | 7`
- [x] 5.3 Add staple state: collect staple ingredients from `newRecipes` (step 4 data) that aren't already in the shopping list; store which ones the user has chosen to add
- [x] 5.4 Create `Step6` function component: renders the staple check-in list with quantity/unit inputs; shows empty state if no staples to review
- [x] 5.5 Rename existing `Step6` (Confirm) to `Step7`; update all references in the wizard
- [x] 5.6 Add `{step === 6 && <Step6 ... />}` and `{step === 7 && <Step7 ... />}` render branches
- [x] 5.7 In the wizard submit (`runGroceryTransition` or equivalent), POST any user-selected staple items to `/api/shopping-list`
- [x] 5.8 Update wizard tests: progress bar shows 7 steps, step 6 renders staple list, staple items are POSTed on submit

## 6. Pre-PR

- [x] 6.1 Run `npm test` — all tests pass
- [x] 6.2 Run `npx tsc --noEmit` — no type errors
- [x] 6.3 Run `npm run lint` — no errors
- [ ] 6.4 Run `/pre-pr` checklist
