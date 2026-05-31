## Context

The first visual refresh PR landed pastel cards + emoji on the recipe list and grocery pages. Four pages remain visually inconsistent: recipe detail, meal plan, schedule, and the new-week wizard. All existing patterns (CARD_BG_COLORS, getRecipeEmoji, CATEGORY_EMOJI, LoadingState) are already in place and can be reused directly.

All changes are purely frontend. No API, schema, or new npm dependencies.

## Goals / Non-Goals

**Goals:**
- Visual consistency across all five main pages
- Ingredient emoji on recipe detail (new utility, reuses existing CATEGORY_EMOJI fallback)
- Numbered instruction steps rendered from free-text blob (visual only, no data change)
- Schedule page driven by stored shopping session week (no raw date inputs)
- Wizard feels like a weekly ritual, not a data-entry form

**Non-Goals:**
- Week-start-day user preference (separate follow-up change requiring schema + API)
- Any backend, schema, or API changes
- Drag-and-drop or swipe gestures in the wizard
- Recipe detail image support

## Decisions

### D1 — ingredient-emoji: keyword map + CATEGORY_EMOJI fallback

`getIngredientEmoji(name: string, category: string): string` in `src/lib/ingredient-emoji.ts`.

Check ~30 common ingredient keywords (case-insensitive substring match), then fall back to `CATEGORY_EMOJI[category]` from the existing `src/lib/categories.ts`. Because CATEGORY_EMOJI covers all 17 categories with a non-null emoji, every ingredient is guaranteed an emoji — no empty/missing cases.

Alternative considered: using only CATEGORY_EMOJI (no keyword map). Rejected because "egg" and "butter" in the same "dairy & eggs" category would both show 🥛, losing specificity.

### D2 — Instructions numbered steps: split on blank lines, not regex

Recipe instructions are stored as a free-text string with blank-line paragraph breaks. Split on `/\n\n+/` to get paragraphs, then render each as a numbered chip (`① ② ③ …` using circled-digit Unicode or a simple counter span). No regex parsing of "Step 1:" prefixes — too fragile across languages.

Alternative considered: regex to find "Step N:" or "1." prefixes. Rejected because it breaks for non-English recipes and recipes without any numbering.

Circled digits ①–⑳ cover 20 steps; beyond 20 use plain `(N)` fallback.

### D3 — Schedule week: read from shopping session, no date pickers

The schedule page already fetches `/api/shopping-session` to read `weekStart`/`weekEnd`. Currently it initialises state from those values and then renders date inputs. Remove the date inputs and render the week as a static formatted header: `"Mon 2 – Sun 8 Jun"`. If the session has no week set, show a soft prompt to run the New Week wizard.

Alternative considered: keep date pickers but style them. Rejected because native `<input type="date">` renders inconsistently across iOS/Android and is the single ugliest element on mobile.

### D4 — Wizard step 2: 7-day chip row + prev/next arrows

Replace two date inputs with a row of 7 day chips (Mon–Sun) showing the selected week. Two arrow buttons shift the week ±7 days. The week is always 7 consecutive days starting on the day derived from `nextMonday()` (current default). This keeps the Mon-start assumption until the weekStartDay preference is built as a follow-up.

Day chips: `w-10 h-12 rounded-xl flex-col`, selected week gets green fill, today gets an amber ring.

### D5 — Wizard step 3: global defaults + per-day accordion exceptions

State shape changes from `Record<string, { lunch: number; dinner: number }>` (per-day) to:
```
lunchDefault: number        // applies to all days
dinnerDefault: number       // applies to all days
exceptions: Record<string, { lunch?: number; dinner?: number }>
```

Effective value for a day = `exceptions[day]?.lunch ?? lunchDefault`.

Render: two large steppers at top, then a row of 7 day chips. Tapping a chip expands an inline panel showing that day's lunch/dinner steppers with a "Reset" link. Days with exceptions show a small dot indicator.

`totalNeeded` is computed from the resolved per-day values (same formula as before, just sourced differently).

### D6 — Wizard progress bar: segmented pill row

6 filled/unfilled segments in the header, replacing "Step N of 6" text. Completed segments: green fill. Current segment: green fill + bold ring. Upcoming: muted. No external library — pure Tailwind divs.

### D7 — Plan page + wizard recipe cards: reuse CARD_BG_COLORS + getRecipeEmoji

Both the plan page entry list and wizard step 4 added-recipes list will use the same `CARD_BG_COLORS` array and `getRecipeEmoji` already established in the recipe list page. Index into the array by `entry.id % CARD_BG_COLORS.length` (plan page) or `index % CARD_BG_COLORS.length` (wizard).

### D8 — Schedule empty slots: dashed pill button

Replace `<button>+ Add meal</button>` text with a styled pill:
`border-2 border-dashed border-muted-foreground/30 rounded-full px-4 py-1.5 text-sm text-muted-foreground/60`

On tap it opens the existing slot picker sheet. No logic change, only styling.

## Risks / Trade-offs

- [Instruction splitting on `\n\n`] Some recipes may use single newlines between steps → they'll render as one big step chip. Mitigation: also split on lines that start with a digit or common step patterns as a secondary pass. Low risk — visually it degrades gracefully (one big chip is still readable).
- [Wizard state shape change for step 3] The `slotPortions` state is read in multiple places (totalNeeded, step 5 slot picker). Changing the shape requires updating all consumers inside `StartNewWeekWizard.tsx`. Mitigation: add a helper `resolvedPortions(day)` → `{ lunch, dinner }` that all consumers call, so the change is isolated.
- [Schedule page: no week set] First-time users (no shopping session yet) will see an empty schedule with a prompt rather than a date picker. Mitigation: show a clear CTA to go to the Plan tab and start a new week.
- [Circled digit emoji rendering] ①–⑳ render as text (not emoji) on all major mobile OS. No platform inconsistency risk.

## Migration Plan

Pure frontend change — no data migration needed. Deploy normally via Vercel preview → user confirms → PR to main.
