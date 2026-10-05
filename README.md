# Price Feed CMS

This CMS uses Firebase Authentication and the Go price feed API. Users sign in with Google; only Firebase users with the custom claim `admin: true` can open the CMS or call its admin endpoints. The Go API verifies the ID token and admin claim on every protected request. Do not place service account credentials in this repository or browser environment variables.

## Local development

Install dependencies with `npm install`, then run `npm run dev`. The local `.env.local` currently points to the development Firebase project and local Go API. Start that API separately.

To use the **production** Firebase project and Cloud Run API from this checkout, keep `.env.production` with these values and run `npm run dev:prod`:

- `NEXT_PUBLIC_FIREBASE_PROJECT_ID=wealth-sphere-prod`
- `NEXT_PUBLIC_API_URL=https://price-feed-api-prod-fglrllx3jq-as.a.run.app` (base URL; do not append `/api`)
- the other Firebase **web app** configuration values from the production Firebase Console

`.env.production` is intentionally ignored by Git. The `dev:prod` and `build:prod` scripts load it into the process before Next.js reads `.env.local`, so the local dev settings cannot override production. For a production build, run `npm run build:prod` and then `npm run start:prod`. These commands use `.next-prod` so they can coexist with the local dev server on `.next`. When deploying elsewhere, set the same `NEXT_PUBLIC_*` values in that build environment.

Enable Google as a sign-in provider and authorize the CMS host in Firebase Authentication for `wealth-sphere-prod` (include `localhost` when testing locally). Grant the intended existing Firebase user the `admin: true` custom claim using a trusted Admin SDK environment, then sign out and back in or click **Refresh access**. The CMS does not grant claims itself.
