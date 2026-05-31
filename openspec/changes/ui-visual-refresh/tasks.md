## 1. Warm Palette Foundation

- [x] 1.1 Update `src/app/globals.css` CSS variables: set `--background` to cream (`0 0% 98%` / `#FAFAF7` equivalent in HSL), update `--card` to a very slightly warm white, update dark mode pastel card dark equivalents
- [x] 1.2 Update `src/components/BottomNav.tsx`: replace `bg-white border-t` with `bg-stone-50/90 backdrop-blur-md border-t border-stone-200/50`; add `dark:bg-stone-900/90 dark:border-stone-700/50` for dark mode

## 2. Recipe Emoji Utility

- [x] 2.1 Create `src/lib/recipe-emoji.ts`: export `getRecipeEmoji(name: string): string` with keyword→emoji map covering all keywords specified in `specs/recipe-emoji/spec.md` (pasta, chicken, salad, soup, pizza, fish, rice, cake, curry, taco, bread, egg, shrimp, burger, steak, pork, mushroom, potato, noodle, pancake, smoothie), defaulting to 🍳
- [x] 2.2 Write unit tests `tests/lib/recipe-emoji.test.ts`: test keyword match, case-insensitivity, no-match default, first-keyword-wins with a multi-keyword name

## 3. Recipe List Card Redesign

- [x] 3.1 Replace `CARD_COLORS` in `src/app/recipes/page.tsx` with `CARD_BG_COLORS` — a static array of Tailwind bg classes: `["bg-amber-50", "bg-rose-50", "bg-orange-50", "bg-emerald-50", "bg-violet-50", "bg-sky-50"]` with dark-mode equivalents `["dark:bg-amber-950/30", ...]`; update `cardColor` → `cardBgColor` function
- [x] 3.2 Update recipe card JSX: remove `border-l-4 border-l-{color}` left border; apply `cardBgColor(recipe.name)` as bg class; add `<span className="text-3xl">{getRecipeEmoji(recipe.name)}</span>` above the recipe name; increase card padding/min-height for breathing room; update shadow to `shadow-sm`

## 4. i18n Strings

- [x] 4.1 Add to `messages/en.json`: per-page loading keys (`recipes.loading`, `grocery.loading`, `mealPlan.loading`), empty state keys (`recipes.emptyTitle`, `recipes.emptySubtext`, `recipes.emptyAddFirstRecipe`, `grocery.emptyTitle`, `grocery.emptySubtext`, `grocery.allDoneTitle`, `grocery.allDoneSubtext`, `mealPlan.emptyTitle`, `mealPlan.emptySubtext`, `mealPlan.emptyBrowseRecipes`), error keys (`common.errorTitle`, `common.errorSubtext`)
- [x] 4.2 Add the same keys to `messages/fr.json`, `messages/es.json`, `messages/zh-CN.json` with appropriate translations (use natural phrasing, not literal translation of English)

## 5. Reusable LoadingState Component

- [x] 5.1 Create `src/components/LoadingState.tsx`: accepts `emoji: string` and `message: string` props; renders centered large emoji with `animate-pulse` + message text in `text-muted-foreground`
- [x] 5.2 Write component test `tests/components/LoadingState.test.tsx`: renders emoji and message, applies pulse class

## 6. Playful Empty + Loading States

- [x] 6.1 Update `src/app/recipes/page.tsx`: replace `<p className="text-muted-foreground">{tCommon("loading")}</p>` with `<LoadingState emoji="🍳" message={t("loading")} />`; replace the `noRecipes` empty state (plain text + link) with the new visual empty state (🧑‍🍳 emoji + `t("emptyTitle")` heading + `t("emptySubtext")` subtext + CTA button that calls `setShowAddSheet(true)`)
- [x] 6.2 Update `src/app/grocery-list/page.tsx`: replace loading text with `<LoadingState emoji="🛒" message={t("loading")} />`; replace `totalCount === 0` empty state with visual empty state (🛒 + `t("emptyTitle")` + `t("emptySubtext")` + [Go to Meal Plan] button); add all-done state: when `checkedItems.length > 0 && uncheckedItems.length === 0`, render 🎉 + `t("allDoneTitle")` + `t("allDoneSubtext")` in place of the unchecked section
- [x] 6.3 Update meal plan page (`src/app/meal-plan/page.tsx`): replace loading text with `<LoadingState emoji="📅" message={t("loading")} />`; add visual empty state (📅 + `t("emptyTitle")` + `t("emptySubtext")` + [Browse Recipes] link to `/recipes`)

## 7. Error States with Character

- [x] 7.1 Update error states in `src/app/recipes/page.tsx`, `src/app/grocery-list/page.tsx`, and `src/app/meal-plan/page.tsx`: replace `<p className="text-destructive">...</p>` with a centered block showing 🔥 + `tCommon("errorTitle")` + `tCommon("errorSubtext")`

## 8. Favourite Star Animation

- [x] 8.1 Add `@keyframes star-pop { 0% { transform: scale(1) } 50% { transform: scale(1.4) } 100% { transform: scale(1) } }` and `.animate-star-pop { animation: star-pop 200ms ease-out }` to `src/app/globals.css`
- [x] 8.2 In `src/app/recipes/[id]/page.tsx`, apply `animate-star-pop` class to the favourite button on toggle — use a state variable `justToggled` (set true on click, reset after 200ms) to conditionally apply the class

## 9. Grocery Category Emoji

- [x] 9.1 Create a static `CATEGORY_EMOJI` map in `src/app/grocery-list/page.tsx` (or extract to `src/lib/categories.ts`): produce→🥦, meat→🥩, dairy→🥛, grains→🌾, canned→🥫, spices→🧂, drinks→🧃, condiments→🍳, bakery→🍰, household→🧹, frozen→❄️, other→🛒
- [x] 9.2 Update category header rendering in `src/app/grocery-list/page.tsx` to prepend the emoji: `{CATEGORY_EMOJI[category] ?? "🛒"} {tCat(category)}`

## 10. Update Tests

- [x] 10.1 Update `tests/components/RecipesPage.test.tsx`: replace `expect(screen.getByText("Loading…"))` assertion with one that matches the new `LoadingState` component output (query by the emoji or the loading message text); update the empty state test to look for the new heading text instead of "No recipes found."
- [x] 10.2 Update `tests/components/GroceryListPage.test.tsx`: replace `expect(screen.getByText("Loading…"))` with the new loading state assertion; add a test for the all-done celebration state
- [x] 10.3 Run `npm test` and fix any remaining snapshot or string-match failures
