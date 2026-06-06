## Why

The app functions well but feels like a productivity tool rather than a food app — the visual register is closer to a to-do list than a cookbook. The recipe list has no visual differentiation between cards (only a thin colored left border), loading states are plain text, and empty states are bare text links with no personality. This refresh makes browsing feel like exploring and gives the app warmth and character appropriate to its purpose.

## What Changes

- **Warm palette**: Background shifts from pure white to cream (`#FAFAF7`); card backgrounds use warm pastel fills (amber, rose, orange, emerald, violet) instead of white
- **Graphic recipe cards**: Full pastel background fill per card with a large food emoji (derived from recipe name via keyword map) as visual anchor; left border removed
- **Recipe emoji utility**: New `src/lib/recipe-emoji.ts` — keyword→emoji map, no DB change
- **Bottom nav glass effect**: `backdrop-blur` frosted glass instead of solid white bar
- **Grocery category emoji**: Static emoji map added to category headers (🥩 🥦 🥛 etc.)
- **Reusable loading component**: Animated emoji + contextual message per page replaces "Loading..." text
- **Playful empty states**: Distinct states for recipe list (new user), grocery empty, grocery all-done
- **Favourite star animation**: CSS keyframe burst on toggle (scale 1→1.4→1, 200ms)
- **Error states with character**: 🔥 emoji + warm message instead of red text
- **Meal plan empty state**: Warm invite message + CTA

## Capabilities

### New Capabilities
- `recipe-emoji`: Keyword-based emoji assignment for recipes (client-side utility, no data model change)
- `playful-states`: Empty states, loading states, and error states with visual personality and contextual messaging

### Modified Capabilities
<!-- No existing spec-level requirement changes — this is purely a visual/UX layer on top of existing functionality -->

## Impact

- `src/app/globals.css` — CSS variable palette tokens updated
- `src/app/recipes/page.tsx` — card rendering, loading state, empty state
- `src/app/grocery-list/page.tsx` — category headers, loading state, empty states (no plan, all done)
- `src/app/meal-plan/page.tsx` — loading state, empty state
- `src/components/BottomNav.tsx` — glass nav bar
- `src/lib/recipe-emoji.ts` — new file
- `src/components/LoadingState.tsx` — new reusable component
- `src/i18n/messages/en.json` (and fr/es/zh-CN) — new strings for empty/loading messages
- No backend changes, no schema changes, no new dependencies
- Dark mode CSS variables updated to match warm palette
