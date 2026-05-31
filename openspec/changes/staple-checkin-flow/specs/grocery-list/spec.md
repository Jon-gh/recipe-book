## MODIFIED Requirements

### Requirement: Staple items excluded from grocery list display
Meal plan ingredients in staple categories (`spices & herbs`, `condiments & sauces`) SHALL NOT appear on the grocery list. Shopping list items in those categories (added via the staple check-in flow or manually) SHALL still appear. This replaces the previous show/hide toggle behaviour.

#### Scenario: Meal plan staple ingredient not shown
- **WHEN** the meal plan contains a recipe with a staple-category ingredient
- **THEN** that ingredient does not appear in the grocery list item groups

#### Scenario: Shopping list item in staple category shown
- **WHEN** the user has added a staple-category ingredient via the check-in flow or manual add
- **THEN** that item appears in the grocery list like any other shopping list item

## REMOVED Requirements

### Requirement: Show/hide staples toggle
**Reason**: Replaced by the staple check-in flow. Staple decisions are made at planning time; the toggle is no longer needed on the grocery list.
**Migration**: Users who previously relied on the toggle to see recipe-quantity staples should use the staple check-in step when adding recipes, or the manual add button on the grocery list.
