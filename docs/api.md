# API Reference

## What
All API routes live under `src/app/api/`. They are Next.js App Router route handlers and run as Vercel serverless functions in production. All routes return JSON.

## Ingredients

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/ingredients` | List all shared ingredient records |

### GET `/api/ingredients` — query params
| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Case-insensitive search on ingredient name |

Ingredients are the canonical, shared entities referenced by recipe ingredients. The same `Ingredient` record (e.g. "garlic") is reused across all recipes that contain it. Results are sorted alphabetically by name.

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

## Grocery List

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/grocery-list` | Aggregated, scaled grocery list from current meal plan |

### Notes
- Ingredients are scaled by the `servings` on each meal plan entry relative to the recipe's base servings
- Items with the same `name + unit` are merged into a single line
- **`export const dynamic = "force-dynamic"` is set on this route — do not remove it.** Removing it causes Next.js to cache the response and users see a stale grocery list.
