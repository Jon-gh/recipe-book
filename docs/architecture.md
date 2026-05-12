# Architecture

## What
This document covers the directory structure, data layer decisions, and caching behaviour of the Recipe Book app. Read this when adding new pages, modifying the database schema, or debugging stale data.

## Data Flow
```
Browser
  → src/middleware.ts (Better Auth — redirects unauthenticated to /auth/signin)
  → Next.js pages (App Router — mostly client components)
  → /api/* route handlers → requireUserId() → Prisma ORM → Neon Postgres
      → Anthropic SDK → Claude Haiku      (AI recipe extraction)
      → src/lib/grocery-list.ts           (ingredient scaling + aggregation)
  → /api/auth/[...all] (Better Auth endpoints — sign-in, OAuth callback, sign-out, password reset)
```

## Key Directories

| Path | Purpose |
|------|---------|
| `src/types.ts` | Shared TypeScript types: `Ingredient`, `Recipe`, `RecipeIngredient`, `MealPlanEntry`, `GroceryItem`, `RecipeFormData` |
| `src/lib/prisma.ts` | Prisma client singleton — prevents too-many-connections in dev/serverless |
| `src/lib/auth.ts` | Better Auth server config (`auth`) + `requireUserId()` helper — call at the top of every API route handler |
| `src/lib/auth-client.ts` | Better Auth client instance (`authClient`) — use in client components for sign-in, sign-out, `useSession()` |
| `src/lib/grocery-list.ts` | `aggregateGroceryList()` — scales ingredients by servings and merges duplicates across meal plan entries |
| `src/lib/categories.ts` | `CATEGORIES` constant (10 entries, each with `name` + `isStaple`); `CATEGORY_NAMES` array; `categoryIsStaple()` helper |
| `src/lib/extract-recipe.ts` | `extractRecipeFromText()`, `extractRecipeFromImage()` — Claude API calls for AI import |
| `src/lib/url-import.ts` | `tryJsonLd()`, `mapJsonLdRecipe()`, `parseIngredientString()` — URL import with JSON-LD parsing and Claude fallback |
| `src/middleware.ts` | Better Auth middleware — redirects unauthenticated requests to `/auth/signin`; excludes `/auth/*`, `/api/auth/*`, and static assets |
| `src/components/Providers.tsx` | `SWRConfig` — redirects to `/auth/signin` on any 401 response (no SessionProvider needed with Better Auth) |
| `src/app/api/auth/[...all]/` | Better Auth catch-all route (sign-in, sign-out, OAuth callback, password reset) |
| `src/app/auth/reset-password/` | Password reset request page (enter email) |
| `src/app/auth/reset-password/confirm/` | Password reset confirm page (enter new password via token) |
| `src/app/api/recipes/` | REST: list/create, get/update/delete, duplicate, import (text/url/image) — all scoped to authenticated user |
| `src/app/api/ingredients/` | GET — list/search all shared `Ingredient` records |
| `src/app/api/meal-plan/` | REST: list entries, add entry, delete entry — scoped to authenticated user |
| `src/app/api/grocery-list/` | GET — aggregated grocery list; `force-dynamic` to bypass Next.js Data Cache |
| `src/app/api/products/` | GET/PUT/DELETE — ingredient product catalog; system products shared, user products personal |
| `src/app/auth/signin/` | Sign-in page: "Continue with Google" + email+password form; create account toggle |
| `src/app/recipes/` | Recipe list page (search + favourite filter) |
| `src/app/recipes/[id]/` | Recipe detail page (view, delete, duplicate, add to meal plan) |
| `src/app/recipes/[id]/edit/` | Edit recipe page |
| `src/app/recipes/new/` | New recipe page |
| `src/app/meal-plan/` | Meal plan page (add recipes with serving count, remove entries) |
| `src/app/grocery-list/` | Grocery list page — grouped by ingredient category, staple toggle, shopping mode with localStorage persistence; persistent shopping list extras via DB |
| `src/app/api/shopping-list/` | REST: list/add/delete persistent shopping list items |
| `src/app/manifest.ts` | PWA web app manifest (name, icons, theme, PNG icon entries) |
| `src/app/api/generate-icon/` | Temporary edge route — generates apple-touch-icon PNG via `next/og`; delete after generating PNGs |
| `src/components/BottomNav.tsx` | Fixed bottom tab bar (Recipes / Plan / Schedule / Grocery / Sign-out); uses `usePathname` for active state; respects `env(safe-area-inset-bottom)` |
| `src/components/RecipeForm.tsx` | Shared form for new + edit pages; camera-first action sheet import (photo, library, URL, manual); manual form hidden by default for new recipes |
| `src/components/ui/` | shadcn/ui primitives: Button, Card, Badge, Input, etc. |
| `prisma/schema.prisma` | DB schema: `User`, `account`, `session`, `verification` (Better Auth), `Recipe`, `Ingredient`, `RecipeIngredient`, `MealPlanEntry`, `ShoppingListItem`, `Product`, `ShoppingSession` |
| `tests/` | Vitest suite: `tests/lib/`, `tests/api/`, `tests/components/` |

## Database Schema — Key Decisions

### `Ingredient` — shared canonical ingredient entity
**Why:** Ingredients are normalised into their own table so the same ingredient (e.g. "garlic") is represented once, shared across all recipes. This enables: (1) consistent category assignment across recipes, (2) a foundation for custom grocery basket items that reference real ingredients rather than free-text strings.

- `Ingredient.name` has a `@unique` constraint — one canonical record per ingredient name.
- `Ingredient.category` is set on first creation and never overwritten by later recipe imports (**first-write wins**). This prevents a new recipe import from silently reclassifying an ingredient globally.
- Claude assigns categories automatically on AI import (prompt includes the valid list); manual entry gets a dropdown in the form.
- `category` defaults to `"other"`.

**Ingredient resolution on recipe save:** The API performs a case-insensitive lookup by name. If a matching `Ingredient` exists it is reused; otherwise a new one is created. The `RecipeFormData` sent from the client still uses `{name, category, quantity, unit, preparation}` objects — the server handles the resolution transparently.

### `RecipeIngredient.preparation` is a separate field
**Why:** Grocery list aggregation groups by `ingredient.name + unit` only. If preparation ("diced", "sliced") were part of the ingredient name, the same ingredient with different preps would not merge — resulting in duplicate line items on the grocery list.

### `Ingredient.category` — supermarket aisle grouping
**Why:** Ingredients are grouped by category on the grocery list so users can shop efficiently by aisle (all produce together, all meat together, etc.). Categories are defined in `src/lib/categories.ts`. Two categories (`spices & herbs`, `condiments & sauces`) are flagged `isStaple: true` and hidden by default on the grocery list — they're things you likely already have.

### Authentication — Better Auth with per-user data isolation
**Why:** Multiple users can sign in and each sees only their own recipes, meal plan, and shopping list. Authentication uses Better Auth with two sign-in methods: email+password and Google OAuth. Email+password is the primary method (enables credential sharing between household members); Google OAuth is an alternative.

- `User`, `account`, `session`, `verification` models follow the Better Auth + Prisma adapter schema. Better Auth uses Scrypt for password hashing.
- Every API route calls `requireUserId()` from `src/lib/auth.ts` at the top. The helper returns `{ userId: string }` on success or a `NextResponse` 401 on failure. The caller checks `instanceof NextResponse` and returns early.
- All Prisma queries on `Recipe`, `MealPlanEntry`, `ShoppingListItem`, `ScheduledMeal`, and `ShoppingSession` are scoped with `where: { userId }` so rows from other users are never returned.
- `src/middleware.ts` redirects unauthenticated browser requests to `/auth/signin` before they reach any page or API route (except `/api/auth/*` and static assets).
- Password reset emails use nodemailer (configured via `EMAIL_SERVER`/`EMAIL_FROM` env vars). If these vars are unset, the reset endpoint silently skips email sending — the form still shows "check your email" but nothing arrives.

### `Product` — system vs. user products
**Why:** Ingredients added during recipe imports (AI or manual) are shared across all users (`source: "system"`, `userId: null`). Ingredients added individually via the shopping list are personal to the user who created them (`source: "user"`, `userId`).

- Two partial unique indexes enforce this: system product names are globally unique; user product names are unique per user.
- `GET /api/products` returns system products + the current user's personal products via `OR: [{ userId: null }, { userId }]`.
- `PUT` and `DELETE` on `/api/products/[id]` are only permitted for user-owned products. System products return 403.
- When the shopping list POST resolves a product name, it checks: (1) user's own product, (2) system product, (3) create a new user product.

### `ShoppingSession` — per-user (not singleton)
**Why:** Previously a singleton row with `id = "session"`. With multiple users, each user needs their own shopping session state (checked items, week dates, show-staples flag).

- Changed from `@id @default("session")` to `id String @id @default(cuid())` with `userId String @unique`.
- All upserts now use `where: { userId }` instead of `where: { id: "session" }`.

### `ShoppingListItem` — persistent user-added grocery extras
**Why:** Users want to add items to the grocery list at any time (not just during a shopping session) and have them persist across devices. `ShoppingListItem` links to `Ingredient` via FK so category assignment is automatic and items sort into the correct aisle. The same find-or-create logic used on recipe save is applied here.

- `ShoppingListItem` holds `ingredientId`, `quantity`, and `unit` — same shape as `RecipeIngredient` minus the recipe FK.
- Managed via `POST /api/shopping-list` and `DELETE /api/shopping-list/[id]`.
- Displayed alongside meal-plan items on the grocery list page; × button removes them any time.
- Pressing **Done** in shopping mode deletes any checked shopping list items from the DB.

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
