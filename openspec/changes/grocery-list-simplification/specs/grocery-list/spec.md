## Requirements

### Requirement: Single object type on grocery list
The grocery list SHALL display only `ShoppingListItem` rows. There SHALL be no derived lines computed from meal plan entries.

#### Scenario: Meal plan ingredient appears on grocery list
- **GIVEN** a recipe is added to the meal plan with N target servings
- **THEN** its non-staple ingredients are added as `ShoppingListItem` rows, scaled by N/recipe.servings
- **AND** those rows appear on the grocery list

#### Scenario: Same ingredient from two recipes merges
- **GIVEN** two meal plan recipes both contain "butter 100g"
- **WHEN** both are added to the meal plan
- **THEN** the grocery list shows a single "butter" row with the combined quantity

### Requirement: Uniform tap-to-remove behaviour
Tapping any grocery list item SHALL trigger the 10-second undo delete flow. There SHALL be no "tick/strike-through" behaviour.

#### Scenario: Tap removes with undo
- **WHEN** the user taps an item
- **THEN** the item disappears immediately
- **AND** an undo toast appears for 10 seconds
- **AND** tapping undo restores the item

### Requirement: Servings ± applies grocery delta
Incrementing or decrementing servings on a meal plan entry SHALL add or subtract the corresponding per-serving ingredient quantities from the grocery list.

#### Scenario: Increment servings
- **GIVEN** a recipe with 1 banana per serving is on the meal plan at 2 servings (2 bananas on grocery list)
- **WHEN** the user taps +1 serving (to 3)
- **THEN** the grocery list shows 3 bananas

#### Scenario: Decrement servings
- **GIVEN** same recipe at 2 servings (2 bananas)
- **WHEN** the user taps -1 serving (to 1)
- **THEN** the grocery list shows 1 banana

#### Scenario: Decrement to zero removes row
- **GIVEN** a single-ingredient recipe at 1 serving (1 banana)
- **WHEN** the user taps -1 serving (to 0, or recipe removed)
- **THEN** the banana row is removed from the grocery list

### Requirement: Remove recipe applies grocery delta
Removing a recipe from the meal plan SHALL subtract its scaled ingredient quantities from the grocery list. Rows that reach or fall below zero SHALL be deleted.

### Requirement: Staple ingredients excluded from delta
Ingredients in staple categories (`spices & herbs`, `condiments & sauces`) SHALL NOT be written to the grocery list via the delta mechanism. They are handled exclusively by the staple check-in flow.

### Requirement: Manual add unchanged
The manual add-item flow (+ button on grocery list) SHALL continue to work exactly as today: creates a `ShoppingListItem` via `POST /api/shopping-list`.

### Requirement: No auto-clear on week reset
The grocery list SHALL NOT be automatically cleared when the new-week wizard completes. Rows persist until tapped by the user.
