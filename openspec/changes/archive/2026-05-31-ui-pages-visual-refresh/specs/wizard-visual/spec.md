## ADDED Requirements

### Requirement: Wizard shows segmented visual progress bar
The new-week wizard header SHALL replace the "Step N of 6" text label with a row of 6 pill segments. Completed segments SHALL be filled green, the current segment SHALL have a bold green ring, and future segments SHALL be muted.

#### Scenario: Progress bar reflects current step
- **WHEN** the wizard is on step 3
- **THEN** segments 1 and 2 are filled green, segment 3 has a bold ring, segments 4–6 are muted

#### Scenario: All segments filled on step 6
- **WHEN** the wizard reaches step 6
- **THEN** all 6 segments are filled green

### Requirement: Wizard background uses app cream colour
The wizard overlay SHALL use the app's warm cream background (`bg-background`) consistently, matching the overall app palette instead of a stark white.

#### Scenario: Wizard background is cream
- **WHEN** the wizard is open
- **THEN** the overlay background matches the app's `--background` CSS variable (cream)

### Requirement: Wizard step 1 uses pastel recipe cards
Step 1 ("What did you eat?") SHALL render each meal plan entry as a pastel-filled card with the recipe's food emoji, recipe name, total portions, and a consumed stepper. The bordered list layout SHALL be replaced by this card layout.

#### Scenario: Each entry shown as a pastel card with emoji
- **WHEN** the wizard step 1 is displayed with entries
- **THEN** each entry is a pastel card with food emoji and recipe name

#### Scenario: Leftover indicator shown on card
- **WHEN** consumed < total portions for an entry
- **THEN** the card shows the leftover count in amber

### Requirement: Wizard step 2 uses week chip navigation
Step 2 ("New week dates") SHALL replace the two date inputs with a row of 7 day chips showing the selected Mon–Sun week, plus ← (prev week) and → (next week) arrow buttons. The week always spans 7 consecutive days starting on Monday.

#### Scenario: 7 day chips display the selected week
- **WHEN** the wizard is on step 2
- **THEN** a row of 7 chips shows the day names and dates for the selected week, all highlighted

#### Scenario: Next week arrow advances by 7 days
- **WHEN** the user taps the → arrow
- **THEN** the displayed week advances by 7 days

#### Scenario: Prev week arrow moves back by 7 days
- **WHEN** the user taps the ← arrow
- **THEN** the displayed week moves back by 7 days

#### Scenario: Today chip has amber ring
- **WHEN** today falls within the displayed week
- **THEN** the chip for today has an amber ring indicator

### Requirement: Wizard step 3 uses global defaults with per-day exceptions
Step 3 ("Portions per meal") SHALL render two global steppers (Lunch default / Dinner default) at the top, followed by a row of 7 day chips. Tapping a day chip SHALL expand an inline panel with that day's lunch and dinner steppers and a "Reset to default" link. Days with exceptions SHALL show a dot indicator on their chip.

#### Scenario: Global defaults apply to all days without exceptions
- **WHEN** no per-day exceptions are set
- **THEN** totalNeeded equals lunchDefault × days + dinnerDefault × days

#### Scenario: Per-day exception overrides global default
- **WHEN** the user sets Saturday dinner to 4 (global default is 2)
- **THEN** Saturday dinner contributes 4 to totalNeeded, all other days contribute 2

#### Scenario: Reset removes exception
- **WHEN** the user taps "Reset to default" on a day with an exception
- **THEN** that day's exception is removed and the global default applies again

#### Scenario: Dot indicator on exceptional days
- **WHEN** a day chip has a custom exception set
- **THEN** a small dot appears on the day chip

### Requirement: Wizard recipe picker uses pastel card style
In steps 4 and 5, recipe rows in the added-recipes list and schedule sources list SHALL use the pastel card style (CARD_BG_COLORS + getRecipeEmoji), replacing the plain bordered list rows.

#### Scenario: Added recipes shown as pastel cards in step 4
- **WHEN** the user has added recipes in step 4
- **THEN** each added recipe is displayed as a pastel card with its food emoji

#### Scenario: Schedule source rows use pastel style in step 5
- **WHEN** step 5 is displayed
- **THEN** the recipe source allocation rows use the pastel card background style
