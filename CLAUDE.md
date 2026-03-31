# Recipe Book — CLAUDE.md

## What
Mobile-friendly PWA for managing recipes, meal planning, and grocery list generation. Supports manual entry and AI-assisted import (text, URL, image) via the Claude API. Installable on iPhone and Android.

## Why
Replaces scattered recipe bookmarks with a single structured tool. The core value is automatic ingredient scaling across a meal plan and consolidation into a single grocery list — removing manual calculation.

## Tech Stack
- **Next.js 14** (App Router) · **TypeScript** · **Tailwind CSS** · **shadcn/ui**
- **Prisma 5** + **Neon Postgres** (serverless, AWS eu-west-2)
- **Anthropic SDK** (`claude-haiku-4-5-20251001`) — AI recipe extraction
- **Vitest** + **React Testing Library** — unit, API, and component tests
- **Vercel** — deployment and preview environments

## Commands
```bash
npm run dev           # start dev server
npm test              # run all tests (must pass before every commit)
npm run test:watch    # watch mode during development
npm run lint          # ESLint
npx tsc --noEmit      # type check (no output = clean)
npx prisma generate   # regenerate client after schema changes
npx prisma db push    # push schema to Neon (non-destructive)
```

## Environment
Copy `.env.example` to `.env`:
```
DATABASE_URL=      # Neon pooled (?pgbouncer=true&connection_limit=1) — runtime queries
DIRECT_URL=        # Neon direct — Prisma migrations only
ANTHROPIC_API_KEY= # Required for AI import features
```

## Rules for Claude

### Code
- **Default to Server Components** — only add `'use client'` when interactivity or browser APIs are required
- **Do not add features, refactors, or improvements beyond what was asked** — scope creep makes PRs harder to review and introduces unintended side-effects
- **Do not add error handling for scenarios that cannot happen** — trust internal code and framework guarantees; only validate at system boundaries

### Testing
- **Always write tests alongside implementation** — never as a follow-up; untested code is not done
- **Tests must pass before every commit or PR** — a failing suite blocks the merge
- See @docs/testing.md for patterns, mocking examples, and known gotchas

### Git & PRs
- **Never commit or push directly to `dev` or `main`** — always use a feature branch (`feat/`, `fix/`)
- **Always branch from an up-to-date `dev`** — run `git checkout dev && git pull origin dev` before creating any new branch, to avoid missing recent commits
- **Creating a PR does not require approval** — open PRs freely with `gh pr create`
- **Merging always requires explicit user approval** — ask before every `gh pr merge`, whether into `dev` or `main`
- **For iterative bugs**: deploy a preview first (`vercel`), wait for user confirmation the fix works, then create the PR — never merge before the user confirms
- See @docs/deployment.md for the full branching and deploy workflow

### Design Decisions
- **Present options with tradeoffs** before any major architectural or library choice — do not pick unilaterally
- **Provide a summary and next steps** at natural breakpoints in multi-step tasks

### Docs & README
- **Keep CLAUDE.md current throughout development** — update it immediately when a new gotcha, rule, or non-obvious decision is discovered; don't wait for the PR
- **When updating CLAUDE.md, also update README.md** — CLAUDE.md is for AI agents, README.md is for humans; they should stay in sync on project purpose, stack, and setup steps

### Token Efficiency
- **Grep before launching an Explore agent** — use Grep/Read directly for targeted searches; agents are for open-ended exploration only
- **Skip plan mode for changes under ~5 lines** — small fixes do not need a plan
- **Don't use Explore agents when a direct Read would suffice** — if the file path is known, just read it

## Data Flow
```
Browser
  → Next.js pages (App Router — mostly client components for interactivity)
  → /api/* route handlers → Prisma ORM → Neon Postgres
  → /api/recipes/import/* → Anthropic SDK → Claude Haiku (AI extraction)
  → /api/grocery-list → src/lib/grocery-list.ts (scale + aggregate ingredients)
```

## Key Gotchas

### Next.js Caching — live data pages
Three independent cache layers exist. Missing any one causes stale data for the user:

| Layer | Scope | Fix |
|-------|-------|-----|
| Router Cache | Client-side navigation cache | `router.refresh()` in `useEffect` on mount |
| Data Cache | Server-side route handler cache | `export const dynamic = "force-dynamic"` in route file |
| Browser Cache | HTTP response cache | `fetch(url, { cache: "no-store" })` in client component |

**Apply all three to any new page that fetches live data.** The grocery list page is the reference implementation.

### Prisma Client
Generated into `src/generated/prisma` — not committed to git. Run `npx prisma generate` after any schema change. Vercel rebuilds this automatically via `prisma generate && next build` in `package.json`.

## Reference
- @docs/architecture.md — directory map, DB schema decisions, caching detail
- @docs/api.md — full REST endpoint reference
- @docs/testing.md — test patterns, mocking, gotchas
- @docs/deployment.md — git workflow, Vercel deploy, environment variables
