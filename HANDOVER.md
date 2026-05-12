# Handover — Multi-Language Support

**Branch:** `feat/multi-user-auth`
**Plan file:** `/home/desktop-jo/.claude/plans/now-i-would-like-fuzzy-wilkinson.md`

---

## What has been done

Phase 1 (UI translation) is **complete**. All 329 tests pass. Lint and `tsc --noEmit` are clean.

### Infrastructure added

| File | What it does |
|------|-------------|
| `src/i18n/request.ts` | `next-intl` server config — reads `NEXT_LOCALE` cookie, falls back to `"en"`. Exports `SUPPORTED_LOCALES`, `Locale` type, `isValidLocale()`. |
| `next.config.mjs` | Wrapped with `createNextIntlPlugin`. |
| `src/app/layout.tsx` | Uses `getLocale()` / `getMessages()` from `next-intl/server`; sets `lang` attr on `<html>`; wraps tree in `NextIntlClientProvider`. |
| `messages/en.json` | All UI strings in English. **This is the source of truth.** |
| `messages/fr.json` | French translations. |
| `messages/zh-CN.json` | Simplified Chinese translations. |
| `messages/es.json` | Spanish translations. |
| `prisma/schema.prisma` | Added `locale String @default("en")` to `User` model. |
| `src/app/api/user/locale/route.ts` | `GET` returns current user's locale + sets `NEXT_LOCALE` cookie. `PATCH` validates + saves locale to DB + sets cookie. |
| `src/app/settings/page.tsx` | Settings page: language picker (loads via GET, saves via PATCH) + sign-out button. |
| `src/components/BottomNav.tsx` | User-slot now links to `/settings` instead of signing out directly. |
| `src/app/auth/signin/page.tsx` | Sign-up form has a language selector. On successful sign-up it calls `PATCH /api/user/locale`. On sign-in it calls `GET /api/user/locale` to sync the cookie. |

### All components wrapped with `useTranslations()`

Every hardcoded UI string in these files was replaced with `t(key)` calls:
- `src/components/BottomNav.tsx`
- `src/components/RecipeForm.tsx`
- `src/components/StartNewWeekWizard.tsx`
- `src/app/auth/signin/page.tsx`
- `src/app/auth/reset-password/page.tsx`
- `src/app/auth/reset-password/confirm/page.tsx`
- `src/app/grocery-list/page.tsx`
- `src/app/meal-plan/page.tsx`
- `src/app/recipes/page.tsx`
- `src/app/recipes/[id]/page.tsx`
- `src/app/schedule/page.tsx`
- `src/app/products/page.tsx`
- `src/app/settings/page.tsx`

### Test infrastructure

`tests/setup.ts` has a global `vi.mock("next-intl", ...)` that loads `messages/en.json` and resolves translation keys to their English values. It handles:
- Simple substitution: `{name}` → value
- ICU plurals: `{count, plural, one {# word} other {# words}}` → correctly pluralised
- Dotted keys without namespace: `t("auth.noAccount")` (used in SignIn page)

New test files added:
- `tests/api/user-locale.test.ts` — GET/PATCH `/api/user/locale`
- `tests/components/SignInPage.test.tsx` — language picker on sign-up form
- `tests/components/SettingsPage.test.tsx` — settings page language picker

---

## What still needs to be done

### Commit & PR for Phase 1

The branch has uncommitted changes. Before starting Phase 2, commit everything and open the PR:

```bash
git add -A
git commit -m "feat: Phase 1 — UI translation with next-intl (en/fr/zh-CN/es)"
git push
gh pr create --title "feat: multi-language UI support (Phase 1)" --body "..."
```

### Phase 2 — Content translation (separate PR)

User-created recipe names, instructions, and notes are still English-only. Phase 2 adds lazy on-demand translation via DeepL Free. The full spec is in the plan file. Key pieces:

**1. DB schema additions** (`prisma/schema.prisma`)

```prisma
model RecipeTranslation {
  id           String   @id @default(cuid())
  recipeId     String
  recipe       Recipe   @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  locale       String
  name         String
  instructions String
  notes        String   @default("")
  tags         String[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  @@unique([recipeId, locale])
}

model ProductTranslation {
  id        Int     @id @default(autoincrement())
  productId Int
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  locale    String
  name      String
  @@unique([productId, locale])
}
```

**2. `src/lib/translate.ts`** — DeepL integration
- `translateRecipe(recipe, targetLocale)` — one DeepL request for `[name, instructions, notes]`, upserts `RecipeTranslation`.
- `translateProduct(product, targetLocale)` — upserts `ProductTranslation`.
- Env var: `DEEPL_API_KEY` (DeepL Free). Add to `.env.example` and Vercel dashboard.
- Language code map: `{ fr: "FR", es: "ES", "zh-CN": "ZH", en: null }` (skip DeepL for `en`).

**3. Middleware update** — Set `x-user-locale` header on all `/api/` requests so route handlers don't re-read the cookie.

**4. Locale-aware recipe/product routes** — All content GET routes should:
  - Include `translations` in the Prisma select, filtered to `x-user-locale` header value.
  - Merge translated fields over base English fields (English fallback).
  - If no translation exists for a non-English locale, fire `void translateRecipe(...)` in the background and return English immediately.

**5. Grocery list dedup fix** — `aggregateGroceryList()` in `src/lib/grocery-list.ts` currently uses `ingredient.name` as the deduplication key. With translations "tomate" (FR) and "tomato" (EN) would be counted separately. Fix: add `canonicalName` (the English `Product.name`) to `GroceryItem` as the dedup key, keep `name` as the display label.

**6. Product autocomplete fix** — `resolveProductId` and `GET /api/products?q=` only search `Product.name` (English). Update to also search `ProductTranslation.name` for the current locale so French users can find "tomate" and get back the "tomato" product.

---

## Key invariants — do not break

- **`Product.name` is always English** — it is the canonical key. `ProductTranslation` holds display-only names. `resolveProductId` must always operate on `Product.name`.
- **AI import always returns English** — `extractRecipeFromText/Image` return English regardless of user locale. The base `Recipe` row is always English.
- **Category names in DB are English keys** — display translation is `tCat(product.category)` via `next-intl`; never write a translated category name to the DB.
- **Units in DB are English** — `normalizeUnit` stays English-only.
- **Do not extend `requireUserId` to return `locale`** — use a separate `getUserLocale(userId)` utility for Phase 2 routes. This limits which existing test mocks need updating.

---

## Verification before starting Phase 2

Run these to confirm Phase 1 is solid:
```bash
npm test          # 329 tests, all green
npx tsc --noEmit  # no output = clean
npm run lint      # no warnings
```

Manual smoke test:
1. Sign up with French → all UI labels in French, recipe content in English.
2. Go to Settings → change language to Spanish → UI switches without page reload.
3. Sign in → locale cookie is restored from DB.
4. `lang` attribute on `<html>` matches the selected locale.
