## Context

The app uses shadcn/ui with Tailwind CSS and CSS custom properties for theming. The current palette is default shadcn — pure white background, blue-gray text, no warmth. Recipe list cards use a colored left-border derived from a name hash. Loading states are plain `<p>` text. Empty states are inline text with a link. The bottom nav is a solid white bar.

All visual changes are purely presentational — no data model, API, or routing changes.

## Goals / Non-Goals

**Goals:**
- Shift the visual register from productivity tool → food app via palette, card design, and emoji
- Make browsing feel like exploring (graphic cards, visual identity per recipe)
- Add personality to loading, empty, and error states
- Keep all changes to the frontend layer only

**Non-Goals:**
- Recipe photography / image upload (no storage infrastructure)
- Animation libraries (CSS keyframes only)
- Changes to any API, database schema, or auth flow
- Redesigning forms, the schedule page, or the settings page

## Decisions

### D1: Pastel fills via Tailwind classes, not inline styles
**Decision:** Use a static array of Tailwind bg utility classes (`bg-amber-50`, `bg-rose-50`, etc.) hashed from recipe name — same mechanism as the current `CARD_COLORS` array.

**Why:** Tailwind's JIT compiler only includes classes it can statically analyse. Dynamically constructing class names like `bg-${color}-50` gets purged. A static array of complete class strings is the correct Tailwind pattern and zero runtime cost.

**Alternative considered:** CSS custom properties set via inline style. Rejected — requires maintaining a parallel color token system and loses Tailwind dark-mode variants.

### D2: Emoji from keyword matching, not a stored field
**Decision:** `getRecipeEmoji(name: string): string` scans the recipe name for keywords and returns a matching emoji, defaulting to 🍳. No new DB field, no migration.

**Why:** Adding a `emoji` field to the Recipe model for a decorative display hint is over-engineered. The mapping is deterministic and can always be improved later. If a stored field is ever wanted, the utility function is the right place to centralise the logic.

### D3: Reusable `LoadingState` component with emoji + message props
**Decision:** A single `<LoadingState emoji="🍳" message="Checking the recipe box..." />` component replaces all loading text across pages.

**Why:** Loading states are currently three separate `<p>Loading...</p>` strings. A shared component means one place to update animation, one place to test. Props make per-page contextual messages trivial.

**Animation:** CSS `animate-pulse` (already in Tailwind) on the emoji — no custom keyframe needed for loading. The favourite star burst uses a custom `@keyframes star-pop` (scale 1→1.4→1) defined in `globals.css`.

### D4: Dark mode — pastel fills use opacity on dark surface
**Decision:** In dark mode, warm pastel `bg-amber-50` becomes `dark:bg-amber-950/30` — the 950 shade at 30% opacity over the dark card surface. This preserves the color identity without blowing out contrast.

**Why:** Pastel 50-shades are near-white and would create light cards on a dark background — not a dark mode. The 950/30 approach gives a subtle warm tint that reads as "same color family" without breaking readability.

### D5: Bottom nav glass via `backdrop-blur` + semi-transparent bg
**Decision:** `bg-stone-50/90 backdrop-blur-md border-t border-stone-200/50` replaces `bg-white border-t`.

**Why:** The glass effect works only when content scrolls behind it — which is exactly what happens on the recipe and grocery list pages. This requires no JS, no new component — just a class change on the nav.

**Risk:** `backdrop-blur` has no effect if the browser composites the nav separately. On iOS Safari (the primary target), this works correctly.

## Risks / Trade-offs

- **Emoji rendering varies by OS** → Emoji appearance differs between iOS, Android, and desktop. Acceptable — all platforms render recognisable food emoji. The fallback (🍳) is universal.
- **Tailwind class purging** → Mitigated by D1 (static class array). No dynamic class construction.
- **i18n strings** → New loading/empty messages must be added to all four locale files (en, fr, es, zh-CN). Missing keys fall back to the key name, not a crash — but should be complete before shipping.
- **Dark mode pastel legibility** → The 950/30 approach is a reasonable default but may need per-color tuning if any combination has insufficient contrast. Can be adjusted per-card-color if needed.

## Migration Plan

No migration needed — purely additive visual changes. Can be deployed incrementally:
1. Palette + nav glass (globals.css + BottomNav) — zero functional risk
2. Recipe emoji utility + card redesign
3. Loading/empty/error components
4. i18n strings (must land together with the components that use them)

Rollback: revert the feature branch. No DB state to unwind.
