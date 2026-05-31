## ADDED Requirements

### Requirement: Schedule page derives week from shopping session, no date pickers
The schedule page SHALL NOT render `<input type="date">` elements. The displayed week SHALL be derived from `weekStart`/`weekEnd` in `/api/shopping-session`. The week SHALL be shown as a formatted header string (e.g. "Mon 2 – Sun 8 Jun").

#### Scenario: Week header shown from session
- **WHEN** the shopping session has `weekStart` and `weekEnd` set
- **THEN** the page displays a formatted week range header instead of date inputs

#### Scenario: No session week shows a prompt
- **WHEN** the shopping session has no `weekStart`/`weekEnd`
- **THEN** the page shows a message prompting the user to start a new week from the Plan tab

### Requirement: Today's day card is visually highlighted
The schedule page SHALL apply a warm amber background (`bg-amber-50 dark:bg-amber-950/20`) to the day card matching today's date, and display a "Today" pill label alongside the date header.

#### Scenario: Today's card is highlighted
- **WHEN** the schedule page is viewed and today falls within the displayed week
- **THEN** the card for today has the amber background and a "Today" pill

#### Scenario: Past and future days are not highlighted
- **WHEN** a day card is not for today
- **THEN** it has no amber background

### Requirement: Empty meal slots use dashed pill buttons
Empty meal slots (no recipe or note scheduled) SHALL render as a dashed-border rounded pill button rather than a plain text link.

#### Scenario: Empty slot shows dashed pill
- **WHEN** a meal slot has no scheduled meal
- **THEN** a dashed-border rounded pill with an add prompt is displayed

#### Scenario: Tapping dashed pill opens the slot picker
- **WHEN** the user taps an empty dashed pill
- **THEN** the slot picker sheet opens for that date and meal type

### Requirement: Meal slots show ☀️ / 🌙 emoji labels
Lunch slots SHALL be labelled with ☀️ and dinner slots with 🌙 in addition to (or replacing) the text label.

#### Scenario: Lunch slot shows sun emoji
- **WHEN** a lunch slot is displayed
- **THEN** the ☀️ emoji appears as the slot label

#### Scenario: Dinner slot shows moon emoji
- **WHEN** a dinner slot is displayed
- **THEN** the 🌙 emoji appears as the slot label
