## ADDED Requirements

### Requirement: Ingredient emoji utility
The system SHALL provide a `getIngredientEmoji(name: string, category: string): string` function in `src/lib/ingredient-emoji.ts` that returns a single emoji character for any ingredient. The function SHALL first check a keyword map (~30 common ingredients), then fall back to `CATEGORY_EMOJI[category]` from `src/lib/categories.ts`. Every call SHALL return a non-empty string.

#### Scenario: Known ingredient keyword match
- **WHEN** `getIngredientEmoji("garlic", "spices & herbs")` is called
- **THEN** it returns `"🧄"`

#### Scenario: Keyword match is case-insensitive
- **WHEN** `getIngredientEmoji("EGGS", "dairy & eggs")` is called
- **THEN** it returns `"🥚"`

#### Scenario: Keyword match on substring
- **WHEN** `getIngredientEmoji("smoked salmon fillet", "meat & fish")` is called
- **THEN** it returns the fish emoji `"🐟"`

#### Scenario: Unknown ingredient falls back to category emoji
- **WHEN** `getIngredientEmoji("xanthan gum", "baking & sweeteners")` is called
- **THEN** it returns the baking category emoji (non-empty)

#### Scenario: Unknown ingredient AND unknown category returns a non-empty fallback
- **WHEN** `getIngredientEmoji("mystery ingredient", "other")` is called
- **THEN** it returns a non-empty string (the "other" category emoji)
