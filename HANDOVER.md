# Handover — Recipe Book Multi-User Auth (Better Auth)

## Status

PR #65 is open, not yet merged.
Branch: `feat/multi-user-auth`

The NextAuth → Better Auth migration is **complete and tested locally**. Three bugs were found and fixed during initial deploy testing (see commit history below). The next step is a clean redeploy and end-to-end sign-in verification before merging.

---

## What was built

Full multi-user authentication using **Better Auth** with two sign-in methods:
- **Email + password** (primary — allows sharing credentials between household members)
- **Google OAuth** (alternative)

Password reset flow at `/auth/reset-password` (sends email via nodemailer if `EMAIL_SERVER` is set).

All user data (recipes, meal plan, shopping list) is scoped per user. `jonathan.lerch@gmail.com`'s account and all existing recipes were **preserved** — same user ID, no data lost.

**Key files added/changed:**
- `src/lib/auth.ts` — Better Auth server config + `requireUserId()` helper
- `src/lib/auth-client.ts` — Better Auth client (no baseURL — auto-detects from `window.location.origin`)
- `src/middleware.ts` — cookie-based session check (Edge-compatible; full validation in API routes)
- `src/app/api/auth/[...all]/route.ts` — Better Auth catch-all handler
- `src/app/auth/signin/page.tsx` — email+password form with Google OAuth button
- `src/app/auth/reset-password/page.tsx` — request reset link
- `src/app/auth/reset-password/confirm/page.tsx` — set new password via token
- `src/components/BottomNav.tsx` — now hidden on `/auth/*` pages
- `src/components/Providers.tsx` — SessionProvider removed (not needed with Better Auth)
- `prisma/schema.prisma` — replaced NextAuth tables with Better Auth tables
- `prisma/migrate-to-better-auth.ts` — one-time script (already run)
- `prisma/seed-password.ts` — sets initial password for jonathan.lerch@gmail.com
- All 10 API test files — mocks updated from `next-auth` to `@/lib/auth`

All 310 tests pass. Type check and lint clean.

---

## What the user has already done

1. ✅ Ran `INITIAL_PASSWORD=... npx tsx prisma/seed-password.ts` — password is set in the DB
2. ✅ Vercel env vars: user does **not** have `NEXTAUTH_URL` or `NEXTAUTH_SECRET` — they need to add the Better Auth vars fresh (see below)

---

## What still needs to be done before merging

### 1. Set Vercel environment variables

Go to: Vercel → recipe-book → Settings → Environment Variables (Production + Preview)

| Variable | Value | Notes |
|----------|-------|-------|
| `BETTER_AUTH_SECRET` | output of `openssl rand -base64 32` | Random secret — generate a fresh one |
| `BETTER_AUTH_URL` | `https://your-app.vercel.app` | Full production URL, no trailing slash |

`NEXT_PUBLIC_BETTER_AUTH_URL` is **not needed** — the client auto-detects the URL at runtime.

`EMAIL_SERVER` and `EMAIL_FROM` are optional — only needed for password reset emails. Sign-in works without them.

Google OAuth vars (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) are optional — sign-in with email+password works without them.

### 2. Redeploy

After adding env vars, trigger a new deploy (push a commit or click "Redeploy" in Vercel dashboard). The most recent fixes (Edge runtime error, stuck sign-in, BottomNav on auth pages) are in commit `1e14dbf` — make sure the deployed build includes this.

### 3. Test sign-in end-to-end on preview

- Visit preview URL → should land on `/auth/signin` (no BottomNav visible)
- Enter `jonathan.lerch@gmail.com` + password → should redirect to `/recipes` with existing recipes visible
- Sign out → back to `/auth/signin`
- Optional: test "Create account" with a different email → should see empty recipe list

### 4. Merge PR #65

Once sign-in confirmed working, merge. No approval needed for PRs — merging always requires explicit user approval.

---

## Bugs fixed during deploy testing (already in branch)

| Commit | Fix |
|--------|-----|
| `b00a5b8` | Middleware was calling `auth.api.getSession` (uses Prisma/Node.js) in Edge runtime → changed to cookie check |
| `1e14dbf` | `auth-client.ts` had hardcoded `baseURL: http://localhost:3000` fallback → removed, now auto-detects from `window.location.origin` |
| `1e14dbf` | Sign-in form got stuck on "Signing in..." if auth threw instead of returning `{ error }` → added try/catch/finally |
| `1e14dbf` | BottomNav was visible on `/auth/signin` → hidden on all `/auth/*` routes |

---

## Useful context

- `npm test` — 310 tests, all must pass before any commit (enforced by pre-commit hook)
- `npx tsc --noEmit` — type check
- `npm run lint` — ESLint
- `requireUserId()` in `src/lib/auth.ts` — unchanged API; all 14 API routes use it without modification
- Better Auth session cookie: `better-auth.session_token` (dev) or `__Secure-better-auth.session_token` (prod/HTTPS)
- Password hashing: Scrypt via `@better-auth/utils/password` — `prisma/seed-password.ts` uses the same library for consistency
- `docs/architecture.md` — full directory map and auth design decisions
- `docs/api.md` — REST endpoint reference
- `docs/deployment.md` — env vars, Vercel deploy, Google OAuth setup
