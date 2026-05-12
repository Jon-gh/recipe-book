# Future Improvements

Ideas and features to revisit later. Not prioritised.

## Authentication

### Google OAuth sign-in
Allow users to sign in with their Google account as an alternative to email+password.

**What's needed:**
- Create an OAuth 2.0 client in Google Cloud Console
- Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to Vercel env vars (Production + Preview)
- Add authorised redirect URI in Google Cloud Console: `https://your-app.vercel.app/api/auth/callback/google`
- Re-add the "Continue with Google" button to `src/app/auth/signin/page.tsx` (server config in `src/lib/auth.ts` is already wired up and conditionally enabled by the env vars)

**Note:** Google OAuth redirect URIs must be exact URLs — wildcard `*.vercel.app` is not supported, so it will only work on the production URL unless preview URLs are added manually.
