# recipe-emoji Specification

## Purpose
TBD - created by archiving change ui-visual-refresh. Update Purpose after archive.
## Requirements
### Requirement: Recipe emoji derived from name
The system SHALL provide a `getRecipeEmoji(name: string): string` utility that returns a single emoji character representing the recipe based on keyword matching against the recipe name. The match SHALL be case-insensitive. When no keyword matches, the function SHALL return 🍳 as the default.

#### Scenario: Keyword match returns correct emoji
- **WHEN** recipe name contains a known keyword (e.g. "pasta", "chicken", "salad")
- **THEN** `getRecipeEmoji` returns the mapped emoji for that keyword (🍝, 🍗, 🥗)

#### Scenario: No keyword match returns default
- **WHEN** recipe name contains no recognised keywords
- **THEN** `getRecipeEmoji` returns 🍳

#### Scenario: Match is case-insensitive
- **WHEN** recipe name contains a keyword in any case ("PASTA", "Chicken", "salad")
- **THEN** `getRecipeEmoji` returns the same emoji as the lowercase form

#### Scenario: First matching keyword wins
- **WHEN** recipe name contains multiple recognised keywords
- **THEN** `getRecipeEmoji` returns the emoji for the first keyword found in the lookup order

### Requirement: Emoji displayed on recipe cards
The recipe list page SHALL display the emoji returned by `getRecipeEmoji` as a visual anchor at the top of each recipe card, rendered at approximately 2rem size.

#### Scenario: Emoji visible on card
- **WHEN** the recipe list page renders a recipe card
- **THEN** the card displays the recipe's emoji above the recipe name

### Requirement: Keyword coverage
The emoji map SHALL include at minimum the following keyword-to-emoji mappings:
pasta/spaghetti/fettuccine → 🍝, chicken → 🍗, salad → 🥗, soup/stew/chowder → 🍲, pizza → 🍕, fish/salmon/tuna/cod → 🐟, rice → 🍚, cake/dessert/chocolate/brownie → 🎂, curry → 🍛, taco/burrito/quesadilla → 🌮, bread/sandwich/toast → 🥪, egg/omelette/frittata → 🥚, shrimp/prawn → 🍤, burger → 🍔, steak/beef/lamb → 🥩, pork/bacon/ham → 🥓, mushroom → 🍄, potato → 🥔, noodle/ramen/pho → 🍜, pancake/waffle → 🧇, smoothie/juice → 🥤.

#### Scenario: Known keywords resolve correctly
- **WHEN** `getRecipeEmoji` is called with a name containing any of the specified keywords
- **THEN** the corresponding emoji is returned

