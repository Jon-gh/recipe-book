# Recipe Book — CLAUDE.md

## Purpose
Mobile-friendly web app for managing recipes, meal planning, and grocery list generation. Supports manual entry and AI-assisted import (image, URL, pasted text) via the Claude API. Installable as a PWA on iPhone and Android.

## Tech Stack
- **Next.js 14** (App Router) · **TypeScript** · **Tailwind CSS** · **shadcn/ui**
- **Prisma 5** (ORM) · **Neon Postgres** (serverless database, AWS eu-west-2)
- **Anthropic SDK** (`claude-haiku-4-5-20251001`) · **Vitest** + **React Testing Library** (unit + component tests)
- **Vercel** (deployment) · **PWA** (manifest + Apple meta tags for home screen install)

## Key Directories

| Path | Purpose |
|------|---------|
| `src/types.ts` | Shared TypeScript types: `Recipe`, `RecipeIngredient`, `MealPlanEntry`, `GroceryItem`, `RecipeFormData` |
| `src/lib/prisma.ts` | Prisma client singleton (prevents too-many-connections in dev) |
| `src/lib/grocery-list.ts` | `aggregateGroceryList()` — scales and aggregates ingredients across meal plan entries |
| `src/lib/extract-recipe.ts` | `extractRecipeFromText()` and `extractRecipeFromImage()` — Claude API calls |
| `src/lib/url-import.ts` | `tryJsonLd()`, `mapJsonLdRecipe()`, `parseIngredientString()` — URL recipe parsing |
| `src/app/api/recipes/` | REST endpoints: list/create, get/update/delete, duplicate, import (text/url/image) |
| `src/app/api/meal-plan/` | REST endpoints: list, add entry, delete entry |
| `src/app/api/grocery-list/` | GET — aggregated grocery list from current meal plan |
| `src/app/recipes/` | Recipe list page (search + favourite filter) |
| `src/app/recipes/[id]/` | Recipe detail page (view, delete, duplicate, add to plan) |
| `src/app/recipes/[id]/edit/` | Edit recipe page |
| `src/app/recipes/new/` | New recipe page |
| `src/app/meal-plan/` | Meal plan page (add recipes with servings, remove entries) |
| `src/app/grocery-list/` | Grocery list page (copy to clipboard, download .txt) |
| `src/app/manifest.ts` | PWA web app manifest |
| `src/components/RecipeForm.tsx` | Shared form used by new + edit pages; includes AI import panel |
| `src/components/ui/` | shadcn/ui components (button, card, badge, input, etc.) |
| `prisma/schema.prisma` | Database schema: `Recipe`, `RecipeIngredient`, `MealPlanEntry` |
| `public/icon.svg` | PWA home screen icon |
| `tests/` | Vitest suite: `tests/lib/`, `tests/api/`, `tests/components/` |

## Essential Commands

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint
npm run lint

# Type check
npx tsc --noEmit

# Regenerate Prisma client after schema changes
npx prisma generate

# Push schema changes to database
npx prisma db push
```

## Environment
Copy `.env.example` to `.env` and fill in:
```
DATABASE_URL=          # Neon Postgres pooled connection string (?pgbouncer=true&connection_limit=1)
DIRECT_URL=            # Neon Postgres direct connection string (for Prisma migrations)
ANTHROPIC_API_KEY=     # Required for AI import features
```

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/recipes` | List recipes; query params: `q` (search), `favourite=true` |
| POST | `/api/recipes` | Create recipe |
| GET | `/api/recipes/[id]` | Get recipe by id |
| PUT | `/api/recipes/[id]` | Update recipe (replaces ingredients) |
| DELETE | `/api/recipes/[id]` | Delete recipe (cascades to ingredients + meal plan) |
| POST | `/api/recipes/[id]/duplicate` | Duplicate recipe with "(copy)" suffix |
| POST | `/api/recipes/import/text` | Extract recipe from pasted text via Claude |
| POST | `/api/recipes/import/url` | Extract recipe from URL (JSON-LD → Claude fallback) |
| POST | `/api/recipes/import/image` | Extract recipe from image via Claude vision |
| GET | `/api/meal-plan` | List meal plan entries (with recipe + ingredients) |
| POST | `/api/meal-plan` | Add recipe to meal plan |
| DELETE | `/api/meal-plan/[id]` | Remove meal plan entry |
| GET | `/api/grocery-list` | Aggregated grocery list from current meal plan |

## Testing Policy
- **Always write unit tests** for new logic, especially pure functions in `src/lib/` and API route handlers.
- **Always write component tests** for new UI pages and components using React Testing Library.
- **Run tests after every meaningful set of changes** — do not wait until a feature is fully complete.
- Tests live in `tests/lib/` (pure functions), `tests/api/` (route handlers with Prisma mocked via `vi.mock`), and `tests/components/` (React components with `// @vitest-environment jsdom` docblock).
- A passing test suite is required before committing or opening a PR.

```bash
npm test           # run once
npm run test:watch # run in watch mode during development
```

## Git Workflow
- **Never commit or push directly to `dev` or `main`.**
- All work happens on a feature branch (e.g. `feat/my-feature`).
- Branch → PR → `dev` → PR → `main`.
- **Creating a PR does not require approval** — do it freely.
- **Merging a PR always requires explicit user approval** — ask before merging, whether merging into `dev` or `main`.

```
feature branch → PR → dev    (ask for approval before merging)
dev            → PR → main   (ask for approval before merging)
```

## Data Flow
```
Browser → Next.js pages (App Router, client components)
        → API routes → Prisma → Neon Postgres
        → AI import routes → Claude API (Haiku)
        → grocery-list lib (aggregate + scale ingredients)
```

## Database Schema (key decisions)
- `RecipeIngredient.preparation` is a separate field (not part of `name`) so grocery aggregation groups by `name + unit` only
- Cascade deletes: deleting a `Recipe` removes its `RecipeIngredient` and `MealPlanEntry` rows
- Prisma client output is `src/generated/prisma` (not committed to git)
- `datasource db` uses both `url` (pooled, for queries) and `directUrl` (direct, for migrations) to support Neon on Vercel serverless
