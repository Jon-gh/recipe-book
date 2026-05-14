# Handover — Multi-Language Support (Phase 2)

**Branch:** `feat/multi-language-phase2` (to be created from main)

---

## Phase 1 — Status: DONE

UI translation with next-intl is complete and deployed. All 329 tests pass. Two runtime bugs were also fixed post-commit:

- **Build fix:** `SUPPORTED_LOCALES`/`Locale`/`isValidLocale` extracted to `src/i18n/config.ts` so client components no longer import from the server-only `src/i18n/request.ts`.
- **React error #310:** `useSession()` in `BottomNav.tsx` was called after an early return, violating Rules of Hooks on auth-page navigation. Moved above the early return.

---

## Phase 2 — Content Translation via DeepL

User-created recipe names, instructions, and notes are still English-only. Phase 2 adds on-demand translation via DeepL Free API.

### Core model

**Native language, not English-as-canonical**

The base `Recipe` row stores content in its *native language* — the language the recipe was originally written or detected in. English is no longer assumed to be the base. A `nativeLocale` field records what that language is.

- **AI import:** detect source language → extract recipe content in that language → set `nativeLocale` to detected language
- **Manual entry:** `nativeLocale` = user's current locale; content stored as typed, no translation on save
- **Translation:** only happens when a user's display locale ≠ `nativeLocale` — one hop, never two

### Key invariants — do not break

- **`Product.name` is always English** — immutable canonical key used for grocery list dedup across all users. Never overwrite it.
- **`ProductTranslation` holds display names per locale** — populated lazily when a recipe is translated to a new locale. Translate from English via DeepL (Option A — always available, accurate enough for ingredient names).
- **`Product` self-enriches over time** — as recipes get translated to new locales, missing `ProductTranslation` rows are created. No upfront bulk translation needed.
- **AI import returns recipe content in the detected language** — name, instructions, notes, tags in native language. Ingredient canonical names are always returned in English (for `Product` lookup/dedup).
- **Category names in DB are English keys** — display translation is `tCat(product.category)` via `next-intl`; never write a translated category name to the DB.
- **Units in DB are English** — `normalizeUnit` stays English-only.
- **Do not extend `requireUserId` to return `locale`** — use a separate `getUserLocale(userId)` utility for Phase 2 routes.
- **Writes always stay in native language** — PUT/edit routes never translate content back to the base `Recipe` row.

### Translation trigger points (eager — no lazy fire-and-forget)

| Trigger | Action |
|---------|--------|
| AI import, user locale ≠ detected language | Translate recipe + missing product names before returning |
| AI import, user locale = detected language | No translation needed |
| Manual save | No translation needed (`nativeLocale` = user locale) |
| GET recipe, no translation exists for user locale | Translate eagerly, return translated result (not fire-and-forget) |
| GET products, missing `ProductTranslation` for locale | Translate from English via DeepL, upsert, return |

---

## What needs to be built

### 1. DB schema (`prisma/schema.prisma`)

Add `nativeLocale` to `Recipe` and two new models:

```prisma
// Add to Recipe model:
nativeLocale String @default("en")
translations RecipeTranslation[]

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

// Add to Product model:
translations ProductTranslation[]

model ProductTranslation {
  id        Int     @id @default(autoincrement())
  productId Int
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  locale    String
  name      String
  @@unique([productId, locale])
}
```

Run `npx prisma db push` after schema changes.

### 2. `src/lib/translate.ts` — DeepL integration

```typescript
const DEEPL_LANG: Record<string, string | null> = {
  fr: "FR", es: "ES", "zh-CN": "ZH", en: null  // null = skip, already target
};

// Translate recipe content to targetLocale. Upserts RecipeTranslation row.
async function translateRecipe(recipe, targetLocale): Promise<RecipeTranslation>

// Translate product display name from English to targetLocale.
// Upserts ProductTranslation row.
async function translateProduct(product, targetLocale): Promise<ProductTranslation>

// Translate a batch of product ids missing a translation for targetLocale.
async function translateMissingProducts(productIds: number[], targetLocale): Promise<void>
```

One DeepL request per recipe (batch: name + instructions + notes + tags array).
Product names translated from `Product.name` (English) — always Option A.

Env var: `DEEPL_API_KEY` (DeepL Free tier). Add to `.env.example` and Vercel dashboard.

### 3. AI import prompt update (`src/lib/extract-recipe.ts`)

Change the extraction prompt to:
1. Detect the source language of the input.
2. Return recipe content (name, instructions, notes, tags) in the detected language.
3. Return ingredient canonical names **in English** (for `Product` lookup) plus a `displayName` in the detected language.
4. Include `nativeLocale` in the returned JSON (IETF tag: `"en"`, `"fr"`, `"zh-CN"`, `"es"`, or best-guess for unsupported locales — fall back to `"en"`).

### 4. Middleware update (`src/middleware.ts`)

Propagate locale to API routes so handlers don't re-read the cookie:

```typescript
const locale = request.cookies.get("NEXT_LOCALE")?.value ?? "en";
const response = NextResponse.next();
response.headers.set("x-user-locale", locale);
return response;
```

### 5. Locale-aware recipe routes

Update `GET /api/recipes` and `GET /api/recipes/[id]` to:
1. Read `x-user-locale` from request headers.
2. If locale = recipe's `nativeLocale` → return base fields as-is.
3. If translation exists for locale → merge: `{ ...recipe, ...translation }`.
4. If no translation → call `translateRecipe()` eagerly, then merge and return.

Update `POST /api/recipes` and `POST /api/recipes/import/*` to:
1. Set `nativeLocale` from detected language (AI import) or user locale (manual).
2. If user locale ≠ `nativeLocale` → call `translateRecipe()` before returning.

### 6. Product routes + autocomplete

Update `GET /api/products?q=` to:
1. Search `Product.name` (English) AND `ProductTranslation.name` for the current locale.
2. Return `displayName` = translation if exists, else `Product.name`.

When creating a new `Product` during recipe save, if the AI provided a native-language `displayName`, upsert a `ProductTranslation` for `nativeLocale` immediately.

### 7. Grocery list dedup fix (`src/lib/grocery-list.ts`)

`aggregateGroceryList()` deduplicates by `ingredient.name` (English canonical). This is unaffected by translations since `Product.name` stays English. Verify this still holds — no change needed unless `GroceryItem` needs a `displayName` field for translated display on the grocery list page.

---

## Suggested build order

1. Schema + `prisma db push`
2. `src/lib/translate.ts` (DeepL client, unit-testable in isolation)
3. AI import prompt update (`extract-recipe.ts`)
4. Middleware locale header
5. Recipe routes (GET + POST/import)
6. Product routes + autocomplete
7. Grocery list — verify dedup still correct, add `displayName` if needed
8. Tests throughout

---

## Verification checklist

```bash
npm test          # all tests green
npx tsc --noEmit  # clean
npm run lint      # no warnings
```

Manual smoke test:
1. Import a recipe from a French URL — recipe stored in French, `nativeLocale = "fr"`.
2. View that recipe as an English user — one-hop translation to English, no double-translation.
3. Chinese user manually types a recipe — stored in Chinese, no translation on save.
4. English user views that Chinese recipe — translated to English on first GET.
5. French user views same Chinese recipe — translated to French on first GET (not via English).
6. Search products in French — "tomate" finds the tomato product via `ProductTranslation`.
7. Switch locales — correct language shown each time, no English flash.
8. Grocery list — no duplicate lines for the same ingredient across locales.
