## ADDED Requirements

### Requirement: Staple check-in sheet on recipe detail
After a recipe is successfully added to the meal plan from the recipe detail page, if that recipe contains any ingredients in staple categories (`spices & herbs`, `condiments & sauces`) that are not already in the user's shopping list, the system SHALL show a "Check your pantry" bottom sheet listing those staple ingredients.

#### Scenario: Recipe has staples not in shopping list
- **WHEN** user taps "Add to Meal Plan" and the recipe has staple ingredients absent from their shopping list
- **THEN** the staple check-in sheet opens automatically after the plan add succeeds

#### Scenario: Recipe has no staples
- **WHEN** user taps "Add to Meal Plan" and the recipe has no ingredients in staple categories
- **THEN** no check-in sheet is shown; the add-to-plan sheet closes normally

#### Scenario: All recipe staples already in shopping list
- **WHEN** user taps "Add to Meal Plan" and every staple ingredient is already present in the shopping list
- **THEN** no check-in sheet is shown

### Requirement: Staple check-in item selection and quantity
The check-in sheet SHALL display each staple ingredient with a quantity input and unit input pre-filled from `Product.defaultQuantity` and `Product.defaultUnit` (falling back to `1` and empty string). The user MAY change the quantity and unit before adding.

#### Scenario: Default quantity pre-filled
- **WHEN** a staple ingredient's product has a non-empty `defaultUnit`
- **THEN** the unit input is pre-filled with that value and quantity with `defaultQuantity`

#### Scenario: User changes quantity before adding
- **WHEN** user edits the quantity or unit field and taps the add button for that item
- **THEN** the item is added to the shopping list with the user-supplied values

#### Scenario: User adds a staple item
- **WHEN** user taps the add button for a staple item in the check-in sheet
- **THEN** the system calls `POST /api/shopping-list` with the item name, user-supplied quantity and unit
- **AND** the item is removed from the check-in sheet

### Requirement: Skip and defer staple review
The check-in sheet SHALL provide a "Review Later" action. Tapping it SHALL close the sheet and set `needsStapleReview = true` on the user's shopping session.

#### Scenario: User defers review
- **WHEN** user taps "Review Later" in the check-in sheet
- **THEN** the sheet closes
- **AND** `PUT /api/shopping-session` is called with `{ needsStapleReview: true }`

#### Scenario: User completes review
- **WHEN** user taps "Done" in the check-in sheet (after adding zero or more items)
- **THEN** the sheet closes
- **AND** `needsStapleReview` is NOT set to true (remains false or is reset to false)

### Requirement: Wizard "Check your pantry" step
The new-week wizard SHALL include a "Check your pantry" step (step 6) between the schedule step and the confirm step. It SHALL show all staple ingredients from the recipes being added in the current wizard run that are not already in the user's shopping list.

#### Scenario: Wizard has recipes with staples
- **WHEN** the wizard run includes new recipes that have staple ingredients not in the shopping list
- **THEN** step 6 shows those staple ingredients with quantity inputs

#### Scenario: Wizard has no new staples to review
- **WHEN** all staple ingredients from the wizard's new recipes are already in the shopping list
- **THEN** step 6 shows an empty state ("All your staples are covered")
- **AND** the user can proceed to the confirm step

#### Scenario: User adds staples in wizard step
- **WHEN** user taps the add button for a staple item in wizard step 6
- **THEN** the item is queued for addition to the shopping list when the wizard submits

#### Scenario: Wizard progress bar reflects 7 steps
- **WHEN** the wizard is open
- **THEN** the progress bar shows 7 total steps

### Requirement: Grocery list staple review reminder
When `needsStapleReview = true` on the user's session, the grocery list page SHALL show a soft banner prompting the user to review their staples.

#### Scenario: Banner shown when review pending
- **WHEN** user opens the grocery list and `needsStapleReview = true`
- **THEN** a banner is shown with a "Review" action and a "Dismiss" action

#### Scenario: Tapping Review opens check-in sheet
- **WHEN** user taps "Review" on the banner
- **THEN** the staple check-in sheet opens showing all staple ingredients from the current meal plan not already in the shopping list

#### Scenario: Tapping Dismiss clears flag
- **WHEN** user taps "Dismiss" on the banner
- **THEN** the banner is hidden
- **AND** `PUT /api/shopping-session` is called with `{ needsStapleReview: false }`
