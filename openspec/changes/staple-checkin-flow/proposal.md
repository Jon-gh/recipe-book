## Why

Staple ingredients (spices, condiments) are hidden on the grocery list because users usually have them — but the current "Show staples" toggle puts the decision at shopping time, surfaces recipe quantities (1 tsp salt) that are useless for buying, and accumulates stale checked-state across weeks. Moving the decision to planning time — immediately after adding a recipe — is more natural, produces correct purchase quantities, and allows the staple toggle to be removed entirely.

## What Changes

- **New**: Staple check-in sheet on the recipe detail page — shown after "Add to Meal Plan" succeeds, lists staple ingredients from that recipe, lets the user pick which to buy this week with a purchase quantity
- **New**: "Check your pantry" step in the new-week wizard (becomes step 6; old step 6 "Confirm" becomes step 7) — same check-in UI for all staples from the wizard's newly added recipes
- **New**: Soft reminder banner on the grocery list page — shown when `needsStapleReview = true` (user skipped check-in)
- **Modified**: Grocery list no longer shows meal plan items in staple categories; only shopping list items in those categories appear (added via check-in or manually)
- **Removed**: "Show staples (xx)" toggle from the grocery list
- **Modified**: `ShoppingSession` schema — remove `showStaples`, add `needsStapleReview Boolean @default(false)`
- Staples added via check-in are `POST /api/shopping-list` items with user-supplied purchase quantity/unit (not recipe quantity)

## Capabilities

### New Capabilities
- `staple-checkin`: The check-in UI and flow for selecting staples to buy — triggered from recipe detail add-to-plan and from the wizard; adds selected items to the shopping list as regular items with purchase quantities

### Modified Capabilities
- `grocery-list`: Staple meal-plan items are filtered out entirely; the show/hide toggle is removed; a `needsStapleReview` banner is added

## Impact

- `src/app/recipes/[id]/page.tsx` — add staple check-in bottom sheet after `handleAddToPlan`
- `src/components/StartNewWeekWizard.tsx` — insert new step 6, renumber old step 6→7, add staple state
- `src/app/grocery-list/page.tsx` — remove `showStaples` state and toggle, filter staple meal-plan items, add review banner
- `prisma/schema.prisma` — swap `showStaples` for `needsStapleReview` on `ShoppingSession`
- `src/app/api/shopping-session/route.ts` — update field handling
- Tests: grocery list component tests, wizard component tests, new check-in sheet tests
