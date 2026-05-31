## ADDED Requirements

### Requirement: Meal plan entries rendered as pastel recipe cards
The meal plan page SHALL render each entry as a pastel-filled card (using the same `CARD_BG_COLORS` array from the recipe list) with the recipe's food emoji, recipe name, servings stepper, and remove button. The bordered table layout SHALL be replaced by this card layout.

#### Scenario: Each entry card has a pastel background and emoji
- **WHEN** the meal plan page loads with entries
- **THEN** each entry is displayed as a card with a pastel background colour and the recipe's food emoji

#### Scenario: Card colour rotates by entry index
- **WHEN** multiple entries are displayed
- **THEN** consecutive entries cycle through the pastel colour palette (no two adjacent entries have the same colour if more than one colour available)

#### Scenario: Servings stepper is integrated into each card
- **WHEN** an entry card is displayed
- **THEN** the − / servings count / + stepper is visible within the card

#### Scenario: Ready-to-cook badge appears on card
- **WHEN** all non-staple ingredients for a recipe are checked in the shopping session
- **THEN** the card shows the "Ready" badge with green styling

#### Scenario: Scheduled servings progress shown on card
- **WHEN** some servings for an entry have been scheduled
- **THEN** the card shows "X/Y servings scheduled" below the recipe name
