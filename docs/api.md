# API Reference

## What
All API routes live under `src/app/api/`. They are Next.js App Router route handlers and run as Vercel serverless functions in production. All routes return JSON.

## Authentication

All routes (except `/api/auth/*`) require an active session. Unauthenticated requests return `401 Unauthorized`. Sessions are managed by Better Auth — see `src/lib/auth.ts` for configuration.

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/auth/[...all]` | Better Auth endpoints (sign-in, sign-out, OAuth callback, password reset) |

**Sign-in methods:** Email+password and Google OAuth. Users sign in via `/auth/signin`. Password reset via `/auth/reset-password`.

All data (recipes, meal plan, shopping list) is **scoped to the authenticated user** — each user sees only their own data.

## Products (Ingredients)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/products` | List products visible to the current user |
| PUT | `/api/products/[id]` | Update a user-owned product |
| DELETE | `/api/products/[id]` | Delete a user-owned product |

### GET `/api/products` — query params
| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Case-insensitive search on product name |
| `source` | `"system"` \| `"user"` | Filter by source |

Returns **system products** (`userId: null`, shared across all users — created during recipe imports) and the **current user's personal products** (`source: "user"`, created via the shopping list). Results are sorted alphabetically by name, limited to 10 when no `source` filter is applied.

**User products** can be renamed, recategorised, or deleted via PUT/DELETE. System products are read-only.

## Recipes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/recipes` | List recipes |
| POST | `/api/recipes` | Create recipe |
| GET | `/api/recipes/[id]` | Get recipe by id |
| PUT | `/api/recipes/[id]` | Update recipe (replaces all ingredients) |
| DELETE | `/api/recipes/[id]` | Delete recipe (cascades to ingredients + meal plan entries) |
| POST | `/api/recipes/[id]/duplicate` | Duplicate recipe with "(copy)" suffix |
| POST | `/api/recipes/import/text` | Extract recipe from pasted text via Claude |
| POST | `/api/recipes/import/url` | Extract recipe from URL (JSON-LD → Claude fallback) |
| POST | `/api/recipes/import/image` | Extract recipe from image via Claude vision |

### GET `/api/recipes` — query params
| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Full-text search on name and description |
| `favourite` | `"true"` | Filter to favourited recipes only |

### Locale-aware recipe responses
`GET /api/recipes` and `GET /api/recipes/[id]` read the `x-user-locale` header (set by middleware from the `NEXT_LOCALE` cookie). When the user's locale differs from the recipe's `nativeLocale`, the handler:
1. Checks for an existing `RecipeTranslation` for that locale.
2. If none exists, calls DeepL to translate eagerly and stores the result.
3. Merges translated `name`, `instructions`, `notes`, `tags` over the base recipe fields.
4. Translates any missing `ProductTranslation` rows for that locale and adds `displayName` to each ingredient's product.

Translation uses Claude Haiku via the same `ANTHROPIC_API_KEY` used for AI import.

### `nativeLocale` on recipe save
`POST /api/recipes` accepts an optional `nativeLocale` field in the body:
- **AI import**: the extraction prompt detects the source language and returns it as `nativeLocale`; it flows through the import form to the save request.
- **Manual entry**: omit `nativeLocale`; the server defaults it to the user's locale from the `x-user-locale` header.

If `nativeLocale ≠ user locale` on save, the handler translates eagerly to the user's locale before returning.

**`PUT /api/recipes/[id]` never changes `nativeLocale`** — edits always update native-language content; the existing `nativeLocale` is preserved.

### POST `/api/recipes/import/text` — body
```json
{ "text": "paste the recipe text here" }
```

### POST `/api/recipes/import/url` — body
```json
{ "url": "https://example.com/recipe" }
```
Tries JSON-LD structured data first; falls back to Claude extraction if not found.

### POST `/api/recipes/import/image` — body
```json
{ "image": "data:image/jpeg;base64,..." }
```
Base64-encoded image. Claude vision extracts the recipe.

### Import response — language fields
All import routes now return `nativeLocale` (detected language) and ingredient `displayName` (ingredient name in the detected language alongside the canonical English `name`).

## Meal Plan

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/meal-plan` | List entries (includes recipe + ingredients) |
| POST | `/api/meal-plan` | Add recipe to meal plan |
| DELETE | `/api/meal-plan/[id]` | Remove entry |

### POST `/api/meal-plan` — body
```json
{ "recipeId": "cuid", "servings": 4 }
```

## Shopping List

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/shopping-list` | List all user-added shopping list items |
| POST | `/api/shopping-list` | Add an item to the shopping list |
| DELETE | `/api/shopping-list/[id]` | Remove an item |

### POST `/api/shopping-list` — body
```json
{ "name": "butter", "quantity": 1, "unit": "" }
```
`quantity` and `unit` are optional (default `1` and `""` respectively). The server resolves `name` to an `Ingredient` via case-insensitive find-or-create (same as recipe save) — category is set automatically.

### GET `/api/shopping-list` — response
Returns `ShoppingListItem[]` — each item includes the nested `ingredient` object (`id`, `name`, `category`).

## Grocery List

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/grocery-list` | Aggregated, scaled grocery list from current meal plan |

### Notes
- Ingredients are scaled by the `servings` on each meal plan entry relative to the recipe's base servings
- Items with the same `name + unit` are merged into a single line
- **`export const dynamic = "force-dynamic"` is set on this route — do not remove it.** Removing it causes Next.js to cache the response and users see a stale grocery list.
