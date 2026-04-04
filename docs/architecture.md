# Architecture

## What
This document covers the directory structure, data layer decisions, and caching behaviour of the Recipe Book app. Read this when adding new pages, modifying the database schema, or debugging stale data.

## Data Flow
```
Browser
  → Next.js pages (App Router — mostly client components)
  → /api/* route handlers
      → Prisma ORM → Neon Postgres        (data persistence)
      → Anthropic SDK → Claude Haiku      (AI recipe extraction)
      → src/lib/grocery-list.ts           (ingredient scaling + aggregation)
```

## Key Directories

| Path | Purpose |
|------|---------|
| `src/types.ts` | Shared TypeScript types: `Recipe`, `RecipeIngredient`, `MealPlanEntry`, `GroceryItem`, `RecipeFormData` |
| `src/lib/prisma.ts` | Prisma client singleton — prevents too-many-connections in dev/serverless |
| `src/lib/grocery-list.ts` | `aggregateGroceryList()` — scales ingredients by servings and merges duplicates across meal plan entries |
| `src/lib/categories.ts` | `CATEGORIES` constant (10 entries, each with `name` + `isStaple`); `CATEGORY_NAMES` array; `categoryIsStaple()` helper |
| `src/lib/extract-recipe.ts` | `extractRecipeFromText()`, `extractRecipeFromImage()` — Claude API calls for AI import |
| `src/lib/url-import.ts` | `tryJsonLd()`, `mapJsonLdRecipe()`, `parseIngredientString()` — URL import with JSON-LD parsing and Claude fallback |
| `src/app/api/recipes/` | REST: list/create, get/update/delete, duplicate, import (text/url/image) |
| `src/app/api/meal-plan/` | REST: list entries, add entry, delete entry |
| `src/app/api/grocery-list/` | GET — aggregated grocery list; `force-dynamic` to bypass Next.js Data Cache |
| `src/app/recipes/` | Recipe list page (search + favourite filter) |
| `src/app/recipes/[id]/` | Recipe detail page (view, delete, duplicate, add to meal plan) |
| `src/app/recipes/[id]/edit/` | Edit recipe page |
| `src/app/recipes/new/` | New recipe page |
| `src/app/meal-plan/` | Meal plan page (add recipes with serving count, remove entries) |
| `src/app/grocery-list/` | Grocery list page — grouped by ingredient category, staple toggle, shopping mode with localStorage persistence and custom item add |
| `src/app/manifest.ts` | PWA web app manifest (name, icons, theme, PNG icon entries) |
| `src/app/api/generate-icon/` | Temporary edge route — generates apple-touch-icon PNG via `next/og`; delete after generating PNGs |
| `src/components/BottomNav.tsx` | Fixed bottom tab bar (Recipes / Meal Plan / Grocery List); uses `usePathname` for active state; respects `env(safe-area-inset-bottom)` |
| `src/components/RecipeForm.tsx` | Shared form for new + edit pages; camera-first action sheet import (photo, library, URL, manual); manual form hidden by default for new recipes |
| `src/components/ui/` | shadcn/ui primitives: Button, Card, Badge, Input, etc. |
| `prisma/schema.prisma` | DB schema: `Recipe`, `RecipeIngredient`, `MealPlanEntry` |
| `tests/` | Vitest suite: `tests/lib/`, `tests/api/`, `tests/components/` |

## Database Schema — Key Decisions

### `RecipeIngredient.preparation` is a separate field
**Why:** Grocery list aggregation groups by `name + unit` only. If preparation ("diced", "sliced") were part of `name`, the same ingredient with different preps would not merge — resulting in duplicate line items on the grocery list.

### `RecipeIngredient.category` — supermarket aisle grouping
**Why:** Ingredients are grouped by category on the grocery list so users can shop efficiently by aisle (all produce together, all meat together, etc.). Categories are defined in `src/lib/categories.ts`. Two categories (`spices & herbs`, `condiments & sauces`) are flagged `isStaple: true` and hidden by default on the grocery list — they're things you likely already have.
- Claude assigns categories automatically on AI import (prompt includes the valid list)
- Manual entry gets a dropdown in the ingredient form
- `category` defaults to `"other"` in the DB so existing records are unaffected

### Cascade deletes on `Recipe`
**Why:** Removing a recipe should clean up all dependent rows automatically. Orphaned `RecipeIngredient` and `MealPlanEntry` rows would silently corrupt the grocery list and meal plan.
- Deleting a `Recipe` → removes its `RecipeIngredient` and `MealPlanEntry` rows

### Prisma client output: `src/generated/prisma`
**Why:** Neon Postgres requires a client built for the serverless edge runtime. The default output location doesn't produce this. The custom path is not committed to git — it's regenerated on every build via `prisma generate && next build`.

### Dual database URLs
**Why:** Neon on Vercel serverless requires a **pooled** connection string for runtime queries (PgBouncer proxies requests across serverless invocations). However, Prisma migrations require a **direct** connection. Using the pooled URL for migrations causes silent failures.

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Pooled — runtime queries via PgBouncer |
| `DIRECT_URL` | Direct — Prisma migrations only |

## Caching — Why It Matters and How to Fix It

### What
Next.js has three independent caching layers. Any page that fetches live data (e.g. grocery list, meal plan) must explicitly bypass all three, or users will see stale responses.

### Why
- **Router Cache** is a client-side in-memory cache that persists across same-session navigation. On back/forward, Next.js serves the cached page without re-fetching.
- **Data Cache** is a server-side cache on route handler responses. Without opt-out, a route handler's response is cached indefinitely across serverless invocations.
- **Browser Cache** caches HTTP responses per standard HTTP headers. Without `cache: "no-store"`, the browser may serve a cached response.

### How — bypass all three

| Layer | Location | Fix |
|-------|----------|-----|
| Router Cache | Client component | `router.refresh()` inside `useEffect` with empty deps `[]` |
| Data Cache | Route handler file | `export const dynamic = "force-dynamic"` at the top of the file |
| Browser Cache | Client `fetch()` call | `fetch(url, { cache: "no-store" })` |

**Reference implementation:** `src/app/grocery-list/` (page) and `src/app/api/grocery-list/` (route handler). Apply this same pattern to any new page that fetches live data.
