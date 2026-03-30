# Recipe Book

A mobile-friendly web app for managing recipes, meal planning, and grocery list generation. Supports manual entry and AI-assisted import from text, URL, or image via the Claude API. Installable as a PWA on iPhone and Android.

## Features

- Browse, search, and filter recipes (by name, tag, ingredient, or favourite)
- Add and edit recipes manually or import via AI (paste text, URL, or photo)
- Mark recipes as favourites
- Duplicate recipes
- Build a meal plan with custom serving sizes per recipe
- Generate a scaled, aggregated grocery list from your meal plan — copy to clipboard or download as `.txt`
- Install to iPhone/Android home screen (PWA — opens fullscreen, no browser UI)

## Tech Stack

- **Next.js 14** (App Router) · **TypeScript** · **Tailwind CSS** · **shadcn/ui**
- **Prisma 5** + **Neon Postgres** (serverless, AWS eu-west-2)
- **Anthropic SDK** (`claude-haiku-4-5-20251001`) for AI recipe extraction
- **Vitest** + **React Testing Library** — 106 tests across unit, API, and component suites
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
| `ANTHROPIC_API_KEY` | Required for AI import features |

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
    api/              # REST API routes
      recipes/        # CRUD, duplicate, import (text/url/image)
      meal-plan/      # Add/list/delete meal plan entries
      grocery-list/   # Aggregated grocery list (force-dynamic)
    recipes/          # Recipe list, detail, new, edit pages
    meal-plan/        # Meal plan page
    grocery-list/     # Grocery list page
    manifest.ts       # PWA manifest
  components/
    RecipeForm.tsx    # Shared add/edit form with AI import panel
    ui/               # shadcn/ui components
  lib/
    prisma.ts         # Prisma client singleton
    grocery-list.ts   # Ingredient scaling and aggregation
    extract-recipe.ts # Claude API extraction helpers
    url-import.ts     # URL + JSON-LD parsing helpers
  types.ts            # Shared TypeScript types
prisma/
  schema.prisma       # Database schema (Recipe, RecipeIngredient, MealPlanEntry)
tests/
  api/                # API route tests (Prisma mocked)
  lib/                # Pure function unit tests
  components/         # React component tests (jsdom)
public/
  icon.svg            # PWA home screen icon
```

## Deployment

Deployed on Vercel. Set the following environment variables in the Vercel dashboard:

- `DATABASE_URL` — pooled Neon connection string
- `DIRECT_URL` — direct Neon connection string
- `ANTHROPIC_API_KEY` — Anthropic API key

The build command (`prisma generate && next build`) runs automatically on deploy.

## Installing on iPhone

1. Open the app in **Safari**
2. Tap the **Share** button
3. Tap **"Add to Home Screen"**
4. Tap **"Add"**

The app opens fullscreen without the Safari browser UI.

## Git Workflow

```
feature branch → preview deploy → user tests → PR → dev → PR → main
```

- All work on feature branches — never commit directly to `dev` or `main`
- PRs require explicit approval before merging
- Preview deployments are used to verify fixes before merging
