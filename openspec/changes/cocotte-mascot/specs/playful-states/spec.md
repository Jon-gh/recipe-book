## MODIFIED Requirements

### Requirement: Reusable loading state component
The system SHALL provide a `<LoadingState message={string} />` component that
displays the Cocotte mascot in its animated `stir` pose and a contextual message
string. The component SHALL no longer take an `emoji` prop. Each page that shows
a loading indicator SHALL use this component with a page-appropriate message.

#### Scenario: Recipe list loading
- **WHEN** the recipe list page is fetching data
- **THEN** the page displays the Cocotte `stir` pose with the message from the `recipes.loading` i18n key

#### Scenario: Grocery list loading
- **WHEN** the grocery list page is fetching data
- **THEN** the page displays the Cocotte `stir` pose with the message from the `grocery.loading` i18n key

#### Scenario: Meal plan loading
- **WHEN** the meal plan page is fetching data
- **THEN** the page displays the Cocotte `stir` pose with the message from the `mealPlan.loading` i18n key

### Requirement: Recipe list empty state
The system SHALL display a distinct empty state on the recipe list page when no
recipes exist, consisting of the Cocotte mascot in its `wave` pose, a heading
from i18n key `recipes.emptyTitle`, subtext from `recipes.emptySubtext`
(mentioning AI import), and a primary CTA button that opens the add-recipe sheet.

#### Scenario: New user sees welcoming empty state
- **WHEN** the authenticated user has no recipes
- **THEN** the recipe list displays the Cocotte `wave` pose, empty-state heading, descriptive subtext, and an "Add your first recipe" button
- **THEN** tapping the button opens the add-recipe bottom sheet

### Requirement: Grocery list empty state — no items
The system SHALL display a distinct empty state on the grocery list page when
there are no meal plan items and no shopping list items, consisting of the
Cocotte mascot in its `hold-basket` pose, heading from `grocery.emptyTitle`,
subtext from `grocery.emptySubtext`, and a "Go to Meal Plan" button linking to
`/meal-plan`.

#### Scenario: Empty grocery list prompts to plan
- **WHEN** the grocery list page has no items (no meal plan entries, no shopping list items)
- **THEN** the page displays the Cocotte `hold-basket` pose, empty heading, subtext, and a [Go to Meal Plan] button
- **THEN** tapping the button navigates to `/meal-plan`

### Requirement: Grocery list all-done state
The system SHALL display a celebration state on the grocery list page when all
items are checked off (checkedItems.length > 0 AND uncheckedItems.length === 0),
consisting of the Cocotte mascot in its `cheer` pose (with celebratory
confetti), heading from `grocery.allDoneTitle`, and subtext from
`grocery.allDoneSubtext`. This state SHALL appear in place of the unchecked
items section.

#### Scenario: All items checked shows celebration
- **WHEN** all grocery items have been checked (moved to in-trolley) and at least one item exists
- **THEN** the page displays the Cocotte `cheer` pose with celebration heading and subtext instead of the empty unchecked section

### Requirement: Error states with character
The system SHALL display mascot-based states when an API call fails or a search
returns nothing, using the Cocotte mascot in its `shrug` pose, a heading from
`common.errorTitle`, and subtext from `common.errorSubtext`. This SHALL replace
any plain red `text-destructive` error text on the recipe list, grocery list,
and meal plan pages.

#### Scenario: Recipe list load error
- **WHEN** the recipe list API call fails
- **THEN** the page displays the Cocotte `shrug` pose with a friendly error message instead of plain red text

### Requirement: Meal plan empty state
The system SHALL display a distinct empty state on the meal plan page when no
meal plan entries exist, consisting of the Cocotte mascot in its `wave` pose,
heading from `mealPlan.emptyTitle`, subtext from `mealPlan.emptySubtext`, and a
"Browse Recipes" button linking to `/recipes`.

#### Scenario: Empty meal plan invites browsing
- **WHEN** the authenticated user has no meal plan entries
- **THEN** the meal plan page displays the Cocotte `wave` pose, warm heading, subtext, and a [Browse Recipes] button
