# Architectural Patterns

## 1. Dataclass Models with Explicit Serialisation

Every model (`RecipeIngredient`, `Recipe`, `MealPlanEntry`, `GroceryItem` — `src/models.py:8-115`) is a plain `@dataclass` with:
- `to_dict()` → JSON-safe `dict`
- `from_dict(data)` → instance, using `data.get(key, default)` for all optional fields

**Convention:** new fields on `Recipe` must always have a default value and use `.get()` in `from_dict` so existing `recipes.json` data loads without error (backwards compatibility).

---

## 2. Load → Mutate → Save Persistence

`src/database.py` has no in-memory cache. Every operation follows:
```
load_recipes() → mutate list → save_recipes()
```
See `update_recipe` (`database.py:46-53`), `toggle_favourite` (`database.py:92-100`), `duplicate_recipe` (`database.py:102-117`).

**Implication:** avoid calling multiple mutating methods in a loop without reloading — each call re-reads the file.

---

## 3. Two-Tier AI Extraction (URL Import)

`src/url_import.py:fetch_recipe_from_url` tries structured data first, then falls back to the API:

1. **JSON-LD path** (`_try_jsonld` → `_map_jsonld_recipe`) — parses `schema.org/Recipe` embedded in the page; no API call, no cost.
2. **Claude fallback** (`extract_recipe_from_text` from `image_import.py`) — used when no JSON-LD is found.

The same `_EXTRACTION_PROMPT` (`image_import.py:18-44`) is shared by both image and text extraction paths.

---

## 4. Shared Recipe Review Loop

`src/cli.py:_run_recipe_review_loop` (`cli.py:48-127`) is the single interactive edit-and-save loop used by all three AI import commands (`add-from-image`, `add-from-url`, `add-from-text`). Adding a new editable field means updating this one function only.

---

## 5. Ingredient Aggregation Key

`src/grocery_list.py:generate_grocery_list` groups by `(normalised_name, unit)` tuple (`grocery_list.py:41`):

- `normalised_name` = lowercased + singularized via `inflect.singular_noun` (`grocery_list.py:14-18`)
- Same ingredient with different units is **kept separate** (prevents unit-conversion errors)
- `preparation` is intentionally excluded from the key — two "sirloin steak" entries with different prep instructions merge into one grocery line

---

## 6. RecipeIngredient vs GroceryItem Separation

`RecipeIngredient` (`models.py:8-40`) carries `preparation` and belongs to a recipe context.
`GroceryItem` (`models.py:106-115`) has only `name, quantity, unit` — no preparation — and is the output type of the grocery aggregation step.

Never put `preparation` on `GroceryItem`; it is stripped during aggregation.

---

## 7. CLI Helper Conventions

- `_print_recipe(recipe, servings?)` — `cli.py:17-36` — single display function used everywhere a recipe is shown
- `_prompt_ingredients()` — `cli.py:130-141` — single ingredient entry loop used by `add`, `edit`, and the review loop
- `_prompt_tags(current?)` — `cli.py:39-45` — always returns a lowercase, stripped list

These helpers must stay in sync if the data model gains new fields.

---

## 8. Test Fixture Pattern

`tests/conftest.py` defines factory functions (`make_spaghetti_bolognese`, etc.) that return fresh `Recipe` instances, then wraps each in a `@pytest.fixture`. This allows tests to request named recipes by fixture name and always get a clean copy. The `tmp_db` fixture uses `tmp_path` (pytest built-in) so tests never touch `data/recipes.json`.
