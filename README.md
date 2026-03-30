# Recipe Book

A web app for managing recipes, meal planning, and grocery list generation. Supports manual entry and AI-assisted import from text, URL, or image via the Claude API.

## Features

- Browse, search, and filter recipes (by name, tag, ingredient, or favourite)
- Add and edit recipes manually or import via AI (paste text, URL, or photo)
- Mark recipes as favourites
- Duplicate recipes
- Build a weekly meal plan with custom serving sizes
- Generate a scaled, aggregated grocery list from your meal plan

## Tech Stack

- **Next.js 14** (App Router) · **TypeScript** · **Tailwind CSS** · **shadcn/ui**
- **Prisma 5** + **Neon Postgres** (serverless)
- **Anthropic SDK** (`claude-haiku-4-5-20251001`) for AI recipe extraction
- **Vitest** for unit testing

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Create a `.env` file in the project root:

```
DATABASE_URL=your_neon_postgres_connection_string
ANTHROPIC_API_KEY=your_anthropic_api_key
```

- Get a free Postgres database at [neon.tech](https://neon.tech)
- Get an API key at [console.anthropic.com](https://console.anthropic.com)

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
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |
| `npm test` | Run unit tests |
| `npm run test:watch` | Run tests in watch mode |
| `npx tsc --noEmit` | Type check |

## Project Structure

```
src/
  app/
    api/          # REST API routes (recipes, meal-plan, grocery-list)
    recipes/      # Recipe list, detail, new, and edit pages
  components/
    RecipeForm.tsx  # Shared add/edit form with AI import
    ui/             # shadcn/ui components
  lib/
    prisma.ts       # Prisma client singleton
    grocery-list.ts # Ingredient aggregation logic
    extract-recipe.ts # Claude API extraction helpers
    url-import.ts   # URL + JSON-LD parsing helpers
  types.ts          # Shared TypeScript types
prisma/
  schema.prisma     # Database schema
tests/
  api/              # API route tests (Prisma mocked)
  lib/              # Pure function unit tests
```

## Deployment

Deploy to [Vercel](https://vercel.com) with one click. Set `DATABASE_URL` and `ANTHROPIC_API_KEY` in the Vercel environment variables dashboard.
