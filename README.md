# Recipe Book

A mobile-friendly web app for managing recipes, meal planning, and grocery list generation. Supports manual entry and AI-assisted import from text, URL, or image via the Claude API. Installable as a PWA on iPhone and Android.

Meet **Cocotte** — the app's mascot, a cheerful enamelled Dutch-oven pot who greets you in empty states and loading screens so the experience feels personal, not off-the-shelf.

## Features

- **Multi-user login** — email+password and Google OAuth via Better Auth; each user's data is fully private
- Browse, search, and filter recipes (by name, tag, ingredient, or favourite)
- Add and edit recipes manually or import via AI (paste text, URL, or photo)
- Mark recipes as favourites
- Duplicate recipes
- Build a meal plan with custom serving sizes per recipe
- Schedule meals across a weekly calendar view
- Generate a scaled, aggregated grocery list from your meal plan — copy to clipboard or download as `.txt`
- Add extra shopping list items outside of the meal plan
- **Multi-language support** — UI and recipe content in English, French, Spanish, and Chinese (Simplified); recipe content translated via Claude Haiku
- Install to iPhone/Android home screen (PWA — opens fullscreen, no browser UI)

## Tech Stack

- **Next.js 14** (App Router) · **TypeScript** · **Tailwind CSS** · **shadcn/ui**
- **Prisma 5** + **Neon Postgres** (serverless, AWS eu-west-2)
- **Anthropic SDK** (`claude-haiku-4-5-20251001`) — AI recipe extraction and content translation
- **Better Auth** — email+password and Google OAuth; password reset via email
- **next-intl** — UI internationalisation (en/fr/es/zh-CN)
- **Vitest** + **React Testing Library** — unit, API, and component test suites
- **Vercel** for deployment

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon Postgres **pooled** connection string (`?pgbouncer=true&connection_limit=1`) |
| `DIRECT_URL` | Neon Postgres **direct** connection string (used by Prisma migrations) |
| `ANTHROPIC_API_KEY` | Required for AI import and content translation |
| `BETTER_AUTH_URL` | Full public URL — `http://localhost:3000` locally, your Vercel URL in production |
| `BETTER_AUTH_SECRET` | Random secret — generate with `openssl rand -base64 32` |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | Same as `BETTER_AUTH_URL` — needed client-side |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (Google Cloud Console) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `EMAIL_SERVER` | SMTP URL for password reset emails — e.g. `smtp://user:pass@smtp.example.com:587` (optional) |
| `EMAIL_FROM` | From address — e.g. `"Recipe Book <noreply@yourdomain.com>"` (optional) |

Get a free Postgres database at [neon.tech](https://neon.tech) and an API key at [console.anthropic.com](https://console.anthropic.com).

### 3. Set up the database

```bash
npx prisma generate
npx prisma db push
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production (`prisma generate` runs first) |
| `npm run lint` | Run ESLint |
| `npm test` | Run all unit and component tests |
| `npm run test:watch` | Run tests in watch mode |
| `npx tsc --noEmit` | Type check |
| `npx prisma generate` | Regenerate Prisma client after schema changes |
| `npx prisma db push` | Push schema changes to database |

## Project Structure

```
src/
  app/
    api/              # REST API routes (all require authentication)
      auth/           # Better Auth catch-all (sign-in, sign-out, OAuth callback, password reset)
      recipes/        # CRUD, duplicate, import (text/url/image)
      meal-plan/      # Add/list/delete meal plan entries
      scheduled-meals/# Schedule meal plan entries on specific dates
      grocery-list/   # Aggregated grocery list (force-dynamic)
      shopping-list/  # User-added persistent shopping extras
      shopping-session/ # Per-user shopping session state (checked items, staples toggle)
      products/       # Ingredient product catalog (GET/PUT/DELETE)
      user/locale/    # Get and update the user's preferred locale
    auth/
      signin/         # Sign-in page (Google OAuth + email+password; create account toggle)
      reset-password/ # Password reset request (enter email)
      reset-password/confirm/ # Password reset confirm (enter new password via token)
    recipes/          # Recipe list, detail, new, edit pages
    meal-plan/        # Meal plan page
    schedule/         # Weekly calendar schedule page
    grocery-list/     # Grocery list page
    products/         # My Items page (user-owned products)
    settings/         # User settings (language preference)
    manifest.ts       # PWA manifest
  components/
    Providers.tsx     # SWRConfig — redirects to /auth/signin on 401
    BottomNav.tsx     # Tab bar (Recipes / Plan / Schedule / Grocery / Sign-out)
    RecipeForm.tsx    # Shared add/edit form with AI import panel
    ui/               # shadcn/ui components
  lib/
    auth.ts           # Better Auth server config + requireUserId() helper
    auth-client.ts    # Better Auth client instance (useSession, sign-in, sign-out)
    prisma.ts         # Prisma client singleton
    grocery-list.ts   # Ingredient scaling and aggregation
    translate.ts      # Recipe and product translation via Claude Haiku
    extract-recipe.ts # Claude API extraction helpers
    url-import.ts     # URL + JSON-LD parsing helpers
    categories.ts     # CATEGORIES constant + categoryIsStaple() helper
  i18n/
    config.ts         # Supported locales and locale validation
    request.ts        # next-intl request config
  middleware.ts       # Better Auth middleware — redirects unauthenticated requests
  types.ts            # Shared TypeScript types
prisma/
  schema.prisma       # Full schema including Better Auth + per-user models
tests/
  api/                # API route tests (Prisma mocked, requireUserId mocked)
  lib/                # Pure function unit tests
  components/         # React component tests (jsdom)
public/
  icon.svg            # PWA home screen icon
```

## Deployment

Deployed on Vercel. Set all environment variables from the table above in the Vercel dashboard (Production + Preview environments). The build command (`prisma generate && next build`) runs automatically on deploy.

**Google OAuth redirect URI:** add `{BETTER_AUTH_URL}/api/auth/callback/google` in Google Cloud Console alongside your localhost redirect URI.

## Installing on iPhone

1. Open the app in **Safari**
2. Tap the **Share** button
3. Tap **"Add to Home Screen"**
4. Tap **"Add"**

The app opens fullscreen without the Safari browser UI.

## Git Workflow

```
feature branch → preview deploy → user tests → PR → main
```

- All work on feature branches — never commit directly to `main`
- PRs require explicit approval before merging
- Preview deployments are used to verify fixes before merging
