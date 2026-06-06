## ADDED Requirements

### Requirement: Cocotte mascot component
The system SHALL provide a single Cocotte mascot component that renders the
character as inline SVG and accepts a `pose` prop selecting one of the canonical
poses. The constant parts of the character — round-belly enamelled Dutch-oven
body, overhanging lid, and two-leaf sprout topper — SHALL be shared across all
poses so that only arms, face, props, and steam differ per pose. Adding a new
pose SHALL NOT require duplicating the shared body.

#### Scenario: Render a pose
- **WHEN** the Cocotte component is rendered with a valid `pose` value
- **THEN** it displays the shared Cocotte body, lid, and sprout
- **AND** it displays the arms, face, props, and steam specific to that pose

#### Scenario: Shared body across poses
- **WHEN** two different poses are rendered
- **THEN** the body, lid, and sprout geometry is identical between them
- **AND** only the arms, face, props, and steam differ

### Requirement: Canonical pose set
The system SHALL provide at least these five poses, each conveying a distinct
intent: `wave` (greeting/invitation), `stir` (busy/working), `hold-basket`
(waiting/empty), `cheer` (celebration), and `shrug` (apology/not-found).

#### Scenario: All starter poses available
- **WHEN** the component is requested with each of `wave`, `stir`, `hold-basket`, `cheer`, `shrug`
- **THEN** each renders its corresponding arms, face, and props

### Requirement: Steam encodes mood
Each pose SHALL render steam whose form communicates the pose's mood: gentle
curls for content/greeting, bubbling for working, a single thin wisp for
waiting/quiet, hearts-and-confetti for celebration, and a small sputter for
apology.

#### Scenario: Mood reads from steam
- **WHEN** the `cheer` pose is rendered
- **THEN** the steam region shows celebratory hearts/confetti rather than plain curls
- **WHEN** the `hold-basket` pose is rendered
- **THEN** the steam region shows a single thin wisp

### Requirement: Visual style and palette
The mascot SHALL use the brand palette — enamel green `#16a34a` body, lighter
green `#22c55e` lid, dark `#14532d` outlines, cream interior, tomato-red
(`#fb7185`) cheek blush, citrus-yellow (`#f59e0b`) wooden spoon, and a green
`#4ade80` sprout — with thick rounded outlines (sticker style). The mascot SHALL
remain legible both as a small inline glyph and at large empty-state size.

#### Scenario: Brand palette applied
- **WHEN** the mascot is rendered
- **THEN** the body fill is the brand enamel green and outlines are the dark green
- **AND** the spoon is citrus-yellow and the cheeks are tomato-red

#### Scenario: Legible at small size
- **WHEN** the mascot is rendered at icon size
- **THEN** the silhouette (round body + overhanging lid + sprout) remains recognisable

### Requirement: Motion is CSS-driven and reduced-motion safe
All mascot animation SHALL be implemented with CSS keyframes/transitions only —
no Lottie or heavy runtime animation libraries — to keep the PWA lightweight,
covering the idle steam loop, entry bounce, and celebration confetti. When the
user's `prefers-reduced-motion` setting is `reduce`, the mascot SHALL render in a
static pose without looping or bouncing animation.

#### Scenario: No heavy animation dependency
- **WHEN** the mascot animates
- **THEN** the animation is driven by CSS keyframes/transitions only

#### Scenario: Respects reduced motion
- **WHEN** `prefers-reduced-motion: reduce` is active
- **THEN** the mascot renders statically without looping steam, bounce, or confetti motion

### Requirement: Accessibility
The mascot SHALL be exposed accessibly: when it is purely decorative alongside
visible text it SHALL be hidden from assistive technology (e.g. `aria-hidden`),
and when it conveys standalone meaning it SHALL carry a descriptive label.

#### Scenario: Decorative mascot is hidden from screen readers
- **WHEN** the mascot appears next to a visible heading and subtext
- **THEN** the mascot is marked decorative (hidden from assistive technology) so the text is the accessible content
