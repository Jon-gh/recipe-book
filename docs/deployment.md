# Deployment

## What
The app deploys to Vercel from the `main` branch. All feature work goes through a short-lived feature branch → preview deploy → PR → `main` pipeline (trunk-based development).

## Why
- Preview deployments let the user verify a fix actually works in a production-like environment before it's merged — this is especially important for caching bugs that only appear on Vercel, not in `npm run dev`
- Merging directly to `main` keeps the integration point simple and ensures the deployed branch always reflects the latest merged work

## Git Workflow

```
feature branch
  → vercel (preview deploy)
    → user confirms fix
      → PR → main  (requires user approval to merge)
```

### Rules
- **Never commit or push directly to `main`** — use `feat/my-feature` or `fix/my-bug` branches
- **All branches target `main`** — there is no `dev` integration branch
- **Creating a PR does not require approval** — open PRs freely with `gh pr create`
- **Merging always requires explicit user approval** — ask before every `gh pr merge`
- **For iterative bug fixes**: deploy a preview, confirm with the user it works, then create the PR — avoid opening a PR before the fix is verified

## Vercel Commands

```bash
vercel          # deploy preview from current branch (used to verify fixes)
vercel --prod   # deploy to production — only run from main
```

Preview URLs are unique per deploy and safe to share for testing.

## Environment Variables

Set in the Vercel dashboard (Production + Preview environments) and locally in `.env`:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon Postgres **pooled** (`?pgbouncer=true&connection_limit=1`) — required for serverless runtime |
| `DIRECT_URL` | Neon Postgres **direct** — Prisma migrations only; do not use for queries |
| `ANTHROPIC_API_KEY` | Required for AI recipe import features |
| `BETTER_AUTH_URL` | Full public URL of the app — e.g. `https://your-app.vercel.app` (or `http://localhost:3000` locally). Used as the primary trusted origin for sign-in requests. |
| `BETTER_AUTH_SECRET` | Random secret for signing sessions — generate with `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID — from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `EMAIL_SERVER` | SMTP connection string for password reset emails — e.g. `smtp://user:pass@smtp.example.com:587` (optional) |
| `EMAIL_FROM` | From address for password reset emails — e.g. `"Recipe Book <noreply@yourdomain.com>"` (optional) |

**Better Auth trusted origins:** `BETTER_AUTH_URL` is added to `trustedOrigins` in `src/lib/auth.ts`. If this var is missing, sign-in fails with "Invalid origin" on every Vercel URL. Vercel's auto-set `VERCEL_URL` is also added to `trustedOrigins` so preview deployments work without extra config — you don't need to set it manually.

**Why two database URLs:** Neon's PgBouncer pooler is required for Vercel serverless (connection limit per function). But Prisma schema migrations require a direct connection — the pooler can't handle migration DDL. Using the wrong URL for the wrong purpose causes silent failures.

**Setting up Google OAuth:** Create an OAuth 2.0 client in Google Cloud Console. Add your Vercel domain + `localhost:3000` as authorised origins, and `{BETTER_AUTH_URL}/api/auth/callback/google` as an authorised redirect URI.

## Build

The build command in `package.json` is:
```bash
prisma generate && next build
```

**Do not remove `prisma generate &&`** — the Prisma client is not committed to git and must be regenerated on every Vercel build. Without it, the build will fail with a missing module error.

## PWA — Installing on Mobile

The app is installable as a Progressive Web App:
- **iPhone**: Safari → Share → Add to Home Screen
- **Android**: Chrome → menu → Add to Home Screen

PWA config lives in `src/app/manifest.ts` and the Apple-specific meta tags are in `src/app/layout.tsx`.

### Generating PNG icons (required for iOS home screen)

iOS cannot render SVG PWA icons — it needs a PNG `apple-touch-icon`. A temporary edge route at `src/app/api/generate-icon/route.tsx` generates these. Run once after setting up the project locally, then delete the route:

```bash
npm run dev   # start dev server

curl "http://localhost:3000/api/generate-icon?size=180" -o public/apple-touch-icon.png
curl "http://localhost:3000/api/generate-icon?size=512" -o public/icon-512.png

# then delete the route
rm -rf src/app/api/generate-icon/
```

Commit the generated PNGs to git — they are referenced by `manifest.ts` and the `apple-touch-icon` meta tag in `layout.tsx`.
