# playful-states Specification

## Purpose
TBD - created by archiving change ui-visual-refresh. Update Purpose after archive.
## Requirements
### Requirement: Reusable loading state component
The system SHALL provide a `<LoadingState emoji={string} message={string} />` component that displays a pulsing emoji and a contextual message string. The component SHALL use Tailwind's `animate-pulse` on the emoji. Each page that currently shows "Loading..." text SHALL use this component with page-appropriate emoji and message.

#### Scenario: Recipe list loading
- **WHEN** the recipe list page is fetching data
- **THEN** the page displays 🍳 with the message from the `recipes.loading` i18n key (e.g. "Checking the recipe box...")

#### Scenario: Grocery list loading
- **WHEN** the grocery list page is fetching data
- **THEN** the page displays 🛒 with the message from the `grocery.loading` i18n key (e.g. "Gathering your ingredients...")

#### Scenario: Meal plan loading
- **WHEN** the meal plan page is fetching data
- **THEN** the page displays 📅 with the message from the `mealPlan.loading` i18n key (e.g. "Building your week...")

### Requirement: Recipe list empty state
The system SHALL display a distinct empty state on the recipe list page when no recipes exist, consisting of a large 🧑‍🍳 emoji, a heading from i18n key `recipes.emptyTitle`, subtext from `recipes.emptySubtext` (mentioning AI import), and a primary CTA button that opens the add-recipe sheet.

#### Scenario: New user sees welcoming empty state
- **WHEN** the authenticated user has no recipes
- **THEN** the recipe list displays 🧑‍🍳 emoji, empty-state heading, descriptive subtext, and an "Add your first recipe" button
- **THEN** tapping the button opens the add-recipe bottom sheet

### Requirement: Grocery list empty state — no items
The system SHALL display a distinct empty state on the grocery list page when there are no meal plan items and no shopping list items, consisting of a large 🛒 emoji, heading from `grocery.emptyTitle`, subtext from `grocery.emptySubtext`, and a "Go to Meal Plan" button linking to `/meal-plan`.

#### Scenario: Empty grocery list prompts to plan
- **WHEN** the grocery list page has no items (no meal plan entries, no shopping list items)
- **THEN** the page displays 🛒 emoji, empty heading, subtext, and a [Go to Meal Plan] button
- **THEN** tapping the button navigates to `/meal-plan`

### Requirement: Grocery list all-done state
The system SHALL display a celebration state on the grocery list page when all items are checked off (checkedItems.length > 0 AND uncheckedItems.length === 0), consisting of a large 🎉 emoji, heading from `grocery.allDoneTitle`, and subtext from `grocery.allDoneSubtext`. This state SHALL appear in place of the unchecked items section.

#### Scenario: All items checked shows celebration
- **WHEN** all grocery items have been checked (moved to in-trolley) and at least one item exists
- **THEN** the page displays 🎉 emoji with celebration heading and subtext instead of the empty unchecked section

### Requirement: Error states with character
The system SHALL display emoji-based error states when API calls fail, using a 🔥 emoji, heading from `common.errorTitle`, and subtext from `common.errorSubtext`. This SHALL replace the current plain red `text-destructive` error text on the recipe list, grocery list, and meal plan pages.

#### Scenario: Recipe list load error
- **WHEN** the recipe list API call fails
- **THEN** the page displays 🔥 with a friendly error message instead of plain red text

### Requirement: Favourite star burst animation
The system SHALL apply a CSS keyframe animation (`star-pop`) to the favourite star button on the recipe detail page when toggled. The animation SHALL scale the element from 1 → 1.4 → 1 over 200ms. The keyframe SHALL be defined in `globals.css`.

#### Scenario: Star animates on toggle
- **WHEN** the user taps the favourite star on the recipe detail page
- **THEN** the star plays the scale-up-then-back animation once

### Requirement: Grocery list category emoji
The system SHALL prefix each grocery list category section header with an emoji from a static category-to-emoji map. The map SHALL cover all categories defined in `src/lib/categories.ts`.

#### Scenario: Category headers show emoji
- **WHEN** the grocery list page renders category section headers
- **THEN** each header displays an emoji prefix before the category name (e.g. "🥩 Meat & Poultry")

### Requirement: Meal plan empty state
The system SHALL display a distinct empty state on the meal plan page when no meal plan entries exist, consisting of a large 📅 emoji, heading from `mealPlan.emptyTitle`, subtext from `mealPlan.emptySubtext`, and a "Browse Recipes" button linking to `/recipes`.

#### Scenario: Empty meal plan invites browsing
- **WHEN** the authenticated user has no meal plan entries
- **THEN** the meal plan page displays 📅 emoji, warm heading, subtext, and a [Browse Recipes] button

### Requirement: i18n strings for all new messages
All user-visible text introduced by this change SHALL be keyed in the next-intl message files for all supported locales (en, fr, es, zh-CN). Keys SHALL follow the existing naming convention of the respective namespace.

#### Scenario: All locales have required keys
- **WHEN** the app is rendered in any supported locale
- **THEN** no i18n key falls back to its raw key string for any loading, empty, or error message introduced by this change

