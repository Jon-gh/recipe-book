# Recipe Book

A mobile-friendly web app for managing recipes, meal planning, and grocery list generation. Supports manual entry and AI-assisted import from text, URL, or image via the Claude API. Installable as a PWA on iPhone and Android.

## Features

- **Multi-user login** — Google OAuth and email magic links via NextAuth.js; each user's data is fully private
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
- **NextAuth.js v4** — Google OAuth + email magic links, database sessions
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
| `ANTHROPIC_API_KEY` | Required for AI import features |
| `NEXTAUTH_URL` | Full public URL — `http://localhost:3000` locally, your Vercel URL in production |
| `NEXTAUTH_SECRET` | Random secret — generate with `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (Google Cloud Console) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `EMAIL_SERVER` | SMTP URL for magic-link emails — e.g. `smtp://user:pass@smtp.example.com:587` |
| `EMAIL_FROM` | From address — e.g. `"Recipe Book <noreply@yourdomain.com>"` |

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
      auth/           # NextAuth catch-all (sign-in, sign-out, OAuth callback)
      recipes/        # CRUD, duplicate, import (text/url/image)
      meal-plan/      # Add/list/delete meal plan entries
      grocery-list/   # Aggregated grocery list (force-dynamic)
      products/       # Ingredient product catalog (GET/PUT/DELETE)
    auth/
      signin/         # Custom sign-in page (Google + magic link)
      verify-request/ # "Check your email" page
    recipes/          # Recipe list, detail, new, edit pages
    meal-plan/        # Meal plan page
    grocery-list/     # Grocery list page
    manifest.ts       # PWA manifest
  components/
    Providers.tsx     # SessionProvider + SWR 401 redirect
    BottomNav.tsx     # Tab bar with sign-out button
    RecipeForm.tsx    # Shared add/edit form with AI import panel
    ui/               # shadcn/ui components
  lib/
    auth.ts           # authOptions + requireUserId() helper
    prisma.ts         # Prisma client singleton
    grocery-list.ts   # Ingredient scaling and aggregation
    extract-recipe.ts # Claude API extraction helpers
    url-import.ts     # URL + JSON-LD parsing helpers
  middleware.ts       # NextAuth middleware — redirects unauthenticated requests
  types.ts            # Shared TypeScript types
  types/
    next-auth.d.ts    # Adds user.id to Session type
prisma/
  schema.prisma       # Full schema including NextAuth + per-user models
tests/
  api/                # API route tests (Prisma mocked, getServerSession mocked)
  lib/                # Pure function unit tests
  components/         # React component tests (jsdom)
public/
  icon.svg            # PWA home screen icon
```

## Deployment

Deployed on Vercel. Set all environment variables from the table above in the Vercel dashboard (Production + Preview environments). The build command (`prisma generate && next build`) runs automatically on deploy.

**Google OAuth redirect URI:** add `https://your-app.vercel.app/api/auth/callback/google` in Google Cloud Console alongside your localhost redirect URI.

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
