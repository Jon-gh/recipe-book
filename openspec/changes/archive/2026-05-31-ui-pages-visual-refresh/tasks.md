## 1. Ingredient emoji utility

- [x] 1.1 Create `src/lib/ingredient-emoji.ts` with `getIngredientEmoji(name, category)` — keyword map (~30 entries) + `CATEGORY_EMOJI` fallback
- [x] 1.2 Write `tests/lib/ingredient-emoji.test.ts` covering keyword match, case-insensitivity, substring match, unknown-ingredient category fallback, and unknown-category fallback

## 2. Recipe detail page

- [x] 2.1 Import `getRecipeEmoji` and render the food emoji in the recipe detail header (large, above or beside the title, same emoji as the list card)
- [x] 2.2 Import `getIngredientEmoji` and render the ingredient emoji as a bullet prefix on each ingredient row
- [x] 2.3 Split `recipe.instructions` on `/\n\n+/` and render each paragraph as a numbered step chip (①–⑳, then `(N)` beyond 20)
- [x] 2.4 Update `tests/components/RecipeDetailPage.test.tsx` (or create it) to verify emoji in header, emoji bullet on an ingredient, and numbered step chips in instructions

## 3. Plan page

- [x] 3.1 Replace the `border rounded-xl overflow-hidden divide-y` entry list with per-entry pastel cards using `CARD_BG_COLORS[index % CARD_BG_COLORS.length]` and `getRecipeEmoji`
- [x] 3.2 Integrate the servings stepper (−/+), recipe name, tags, scheduled progress, and ready badge into the card layout
- [x] 3.3 Update `tests/components/MealPlanPage.test.tsx` to verify entries render as cards (check for emoji or pastel class presence)

## 4. Schedule page

- [x] 4.1 Remove the two `<input type="date">` elements and the state/handlers that drive them
- [x] 4.2 Derive `scheduleFrom`/`scheduleTo` exclusively from `sessionData.weekStart`/`weekEnd`; render a formatted week header string ("Mon 2 – Sun 8 Jun")
- [x] 4.3 Show an empty-state prompt (no date pickers) when `sessionData` has no week set
- [x] 4.4 Apply amber highlight (`bg-amber-50 dark:bg-amber-950/20`) and "Today" pill to the day card matching today's date
- [x] 4.5 Replace empty-slot `<button>+ Add meal</button>` with a dashed-border rounded pill button
- [x] 4.6 Add ☀️ emoji label to lunch slots and 🌙 to dinner slots (alongside or replacing text label)
- [x] 4.7 Update/create `tests/components/SchedulePage.test.tsx` to verify: week header from session, amber class on today's card, dashed pill on empty slot, emoji labels

## 5. Wizard — progress bar & background

- [x] 5.1 Replace the "Step N of 6" text in the wizard header with a row of 6 pill segments; completed = green fill, current = green ring, future = muted
- [x] 5.2 Confirm the wizard overlay uses `bg-background` (cream) consistently — adjust any hardcoded `bg-white` if present

## 6. Wizard — step 1 (pastel recipe cards)

- [x] 6.1 Replace the `border rounded-xl divide-y` list in Step1 with pastel-filled cards per entry using `CARD_BG_COLORS` and `getRecipeEmoji`
- [x] 6.2 Retain consumed stepper (−/+), total portions label, leftover indicator, and fully-consumed label within the card

## 7. Wizard — step 2 (week chip navigation)

- [x] 7.1 Replace the two `<input type="date">` fields in Step2 with a 7-day chip row showing the Mon–Sun week plus ← / → week navigation arrows
- [x] 7.2 Highlight today's chip with an amber ring if today falls in the displayed week
- [x] 7.3 Remove unused `startLabel`/`endLabel` i18n keys from wizard translations if no longer referenced (or leave them — they do no harm)

## 8. Wizard — step 3 (global defaults + exceptions)

- [x] 8.1 Replace `slotPortions: Record<string, {lunch, dinner}>` state with `lunchDefault`, `dinnerDefault`, and `exceptions: Record<string, {lunch?: number; dinner?: number}>`
- [x] 8.2 Add `resolvedPortions(day): {lunch, dinner}` helper used everywhere `slotPortions[day]` was previously accessed (totalNeeded, step 5 slot picker)
- [x] 8.3 Render Step3 as: two global steppers at top, then a row of 7 day chips; tapping a chip expands an inline panel with per-day steppers and a "Reset to default" link
- [x] 8.4 Show dot indicator on day chips that have exceptions

## 9. Wizard — steps 4 & 5 (pastel recipe rows)

- [x] 9.1 In Step4, replace the `border rounded-xl divide-y` added-recipes list with pastel cards using `CARD_BG_COLORS` and `getRecipeEmoji`
- [x] 9.2 In Step5, apply pastel background styling to the schedule-sources allocation rows

## 10. Tests & pre-PR

- [x] 10.1 Run `npm test` — all tests must pass; fix any failures caused by the visual changes
- [x] 10.2 Run `npx tsc --noEmit` — zero type errors
- [x] 10.3 Run `npm run lint` — zero errors
- [x] 10.4 Update `docs/architecture.md` to add entry for `src/lib/ingredient-emoji.ts`
