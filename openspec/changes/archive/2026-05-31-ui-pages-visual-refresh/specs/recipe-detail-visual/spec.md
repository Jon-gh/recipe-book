## ADDED Requirements

### Requirement: Recipe detail shows food emoji in header
The recipe detail page SHALL display the recipe's food emoji (from `getRecipeEmoji(recipe.name)`) prominently in the header area, visually matching the emoji shown on the recipe list card.

#### Scenario: Emoji appears in detail header
- **WHEN** a user opens a recipe named "Pasta Carbonara"
- **THEN** the detail page header shows the 🍝 emoji alongside the recipe title

#### Scenario: Default emoji shown for unrecognised recipe names
- **WHEN** a user opens a recipe with an unrecognised name
- **THEN** the detail page header shows the default 🍳 emoji

### Requirement: Recipe ingredients show per-ingredient emoji
Each ingredient row on the recipe detail page SHALL display an emoji from `getIngredientEmoji(ingredient.product.name, ingredient.product.category)` as a visual bullet preceding the ingredient name and quantity.

#### Scenario: Known ingredient shows specific emoji
- **WHEN** an ingredient is "Eggs" in category "dairy & eggs"
- **THEN** the ingredient row displays 🥚 as its bullet

#### Scenario: Unknown ingredient shows category fallback emoji
- **WHEN** an ingredient has an unrecognised name but a known category
- **THEN** the ingredient row displays the category's emoji as its bullet

### Requirement: Recipe instructions rendered as numbered visual steps
The recipe detail page SHALL split the `instructions` text on blank lines (`\n\n`) and render each paragraph as a numbered step with a visual step-number chip (①②③… up to ⑳; plain `(N)` for steps beyond 20).

#### Scenario: Multi-paragraph instructions become numbered steps
- **WHEN** a recipe has instructions with two blank-line-separated paragraphs
- **THEN** the instructions section shows two numbered step chips, one per paragraph

#### Scenario: Single-paragraph instructions render as one step
- **WHEN** a recipe's instructions contain no blank lines
- **THEN** the instructions section shows a single step chip labelled ①

#### Scenario: Step numbers beyond 20 use plain parenthetical
- **WHEN** a recipe has more than 20 blank-line-separated paragraphs
- **THEN** step 21 onward is labelled (21), (22), etc.
