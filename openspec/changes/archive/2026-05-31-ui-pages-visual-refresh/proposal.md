## Why

The recipe list and grocery pages received a warm visual refresh (pastel cards, emoji, playful states) but four pages — recipe detail, meal plan, schedule, and the new-week wizard — still use the old flat, form-like aesthetic. The visual inconsistency makes the app feel half-finished and the wizard in particular feels like data-entry rather than a weekly ritual.

## What Changes

- **Recipe detail page**: carry the food emoji from the list card into the detail header; add per-ingredient emoji (keyword map + category fallback); auto-number instructions by splitting on blank lines into visual step chips
- **Plan page**: replace the bordered table of entries with pastel recipe cards (emoji + colour fill) matching the recipe list style; servings stepper integrates into each card
- **Schedule page**: remove raw date-picker inputs; derive the displayed week from the stored shopping session; highlight today with a warm amber tint; replace "+ Add meal" text links with dashed pill buttons; add ☀️/🌙 emoji labels for lunch/dinner slots
- **New-week wizard**: replace "Step N of 6" text with a segmented visual progress bar; shift background to app cream; step 1 uses pastel recipe cards with dot-style consumed indicator; step 2 replaces date inputs with a 7-day chip row + prev/next week arrows; step 3 collapses 14 per-day steppers into two global defaults (lunch / dinner) with optional per-day exception expansion; steps 4–6 use pastel card style for recipe rows
- **New utility**: `src/lib/ingredient-emoji.ts` — `getIngredientEmoji(name, category)` keyword map with CATEGORY_EMOJI fallback

## Capabilities

### New Capabilities
- `ingredient-emoji`: Utility that maps an ingredient name to a representative emoji, falling back to the ingredient's grocery category emoji; used on recipe detail ingredient list
- `recipe-detail-visual`: Enhanced recipe detail page with emoji header, per-ingredient emoji, and visually numbered instruction steps
- `plan-page-visual`: Meal plan page entries rendered as pastel recipe cards instead of a bordered row list
- `schedule-page-visual`: Schedule page with session-driven week header (no date pickers), today highlight, dashed empty-slot pills, and meal-type emoji labels
- `wizard-visual`: New-week wizard with segmented progress bar, week chip navigation, global+exception portion step, and pastel recipe cards throughout

### Modified Capabilities

## Impact

- `src/lib/ingredient-emoji.ts` — new file
- `src/app/recipes/[id]/page.tsx` — emoji header, ingredient emoji, numbered instructions
- `src/app/meal-plan/page.tsx` — pastel entry cards
- `src/app/schedule/page.tsx` — remove date pickers, session week header, today highlight, dashed slots
- `src/components/StartNewWeekWizard.tsx` — progress bar, week chip nav, step 3 redesign, pastel cards
- `src/app/globals.css` — any new keyframe/utility needed (e.g. dashed-pill style)
- `messages/*.json` — no new user-visible strings expected; wizard step 2 removes the date label strings if unused
- No API, schema, or backend changes
- No new npm dependencies (CSS only for animations)
