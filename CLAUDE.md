# Recipe Book — CLAUDE.md

## Purpose
CLI app for managing recipes, meal planning, and grocery list generation. Supports manual entry and AI-assisted import (image, URL, pasted text) via the Claude API.

## Tech Stack
- **Python 3.10** · **Click** (CLI) · **Anthropic SDK** (vision & text extraction)
- **inflect** (plural normalisation) · **requests + BeautifulSoup4** (URL import)
- **pytest + pytest-cov** (testing) · **python-dotenv** (env vars)

## Key Directories

| Path | Purpose |
|------|---------|
| `src/models.py` | Dataclasses: `Recipe`, `RecipeIngredient`, `MealPlanEntry`, `GroceryItem` |
| `src/database.py` | JSON file persistence; CRUD + search for recipes and meal plan |
| `src/cli.py` | All Click commands: `recipe`, `plan`, `grocery` groups |
| `src/grocery_list.py` | Ingredient aggregation with scaling and plural normalisation |
| `src/image_import.py` | Claude API calls for image and text recipe extraction |
| `src/url_import.py` | URL fetch → JSON-LD parse → Claude fallback |
| `data/` | `recipes.json` and `meal_plan.json` (runtime data, not committed) |
| `tests/` | Pytest suite; `conftest.py` holds shared fixtures and mock recipes |

## Essential Commands

```bash
# Install dependencies
pip install -r requirements.txt

# Run the app
python main.py --help
python main.py recipe list
python main.py grocery list --output shopping.txt

# Seed demo data
python seed.py

# Run all tests
python -m pytest

# Run tests with coverage
python -m pytest --cov=src
```

## Environment
`ANTHROPIC_API_KEY` must be set (in `.env` or shell) for AI import commands.
`main.py:1-3` loads `.env` automatically via `python-dotenv`.

## Data Flow
```
CLI → Database (JSON files)
    → Extractors (image_import / url_import) → Claude API
    → grocery_list (aggregate + scale ingredients)
```

## Additional Documentation
Check these files when working on the relevant area:

- `.claude/docs/architectural_patterns.md` — design decisions and conventions (serialisation, two-tier extraction, ingredient normalisation, CLI structure)
