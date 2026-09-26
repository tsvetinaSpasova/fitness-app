# FitCoach

An online fitness coaching platform built with Next.js (App Router) and Supabase.

- **Coaches** manage clients, an exercise library, and programme templates; they review client workout logs, weekly check-ins, measurements, and keep private notes.
- **Clients** follow their assigned programme, log workouts set by set, submit weekly check-ins, track measurements, and upload private progress photos.

## Stack

- Next.js 16 (App Router, server components, `src/proxy.ts` for auth-aware routing)
- Supabase: Postgres + Auth + Storage, with row-level security throughout
- Tailwind CSS 4
- Playwright for end-to-end tests

## Setup

1. Copy `.env.local.example` to `.env.local` and fill in your Supabase project URL and anon key (Project Settings → API).
2. Apply the migrations in `supabase/migrations/` (via `supabase db push` or the SQL editor).
3. Optionally run `supabase/seed.sql` to create demo accounts and data.
4. `npm install && npm run dev`

### Demo accounts (from seed.sql)

All with password `password123`:

| Role | Email |
| --- | --- |
| Coach | alex@coach.com |
| Client | sarah@example.com (plus marcus@, emma@, james@, olivia@example.com) |

New sign-ups from the login page always create **client** accounts; coach accounts are created manually.

## Data model notes

- Programme **templates** have `client_id = null`. Assigning a programme to a client creates a **copy** (`client_id` + `original_programme_id` set) via the `copy_programme_for_client` RPC, so RLS lets the client read it and the coach can tweak it per client.
- Progress photos live in the private `progress-photos` storage bucket under `<client_uuid>/…`; the app renders them through short-lived signed URLs.

## Environments & deployment

Two hosted Supabase projects (org `tsvetinaSpasova's Org`, region `eu-west-3`):

| Env | Supabase project | Used by |
| --- | --- | --- |
| Dev | `dgpt` (`eaagogwffqukuvuimcpk`) | local `npm run dev`, e2e tests, seeded demo data |
| Prod | `fitness-app-prod` (`zyzptsshwqzbgzjafqef`) | Vercel deployment, real accounts only (no demo seed) |

- The frontend deploys to **Vercel** (Hobby, project `fitness-app`, team `dgpt1`) from the `main` branch of [github.com/tsvetinaSpasova/fitness-app](https://github.com/tsvetinaSpasova/fitness-app); every push to `main` triggers a production deploy. Live at **https://fitness-app-coral-beta.vercel.app**.
- Vercel's env vars (`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`) are scoped per environment: **Production** deploys use the prod Supabase project, **Preview** deploys (any non-`main` branch push) use the dev project — so pushing a branch gives a shareable preview URL running against dev data. `.env.local` keeps local dev on the dev project.
- Schema changes: files in `supabase/migrations/` are applied to each environment via the Supabase SQL/query API (or `supabase db push`) — dev first, prod after the change ships.
- Prod auth currently **auto-confirms** signups (Supabase's built-in mailer only delivers to team members). Set up custom SMTP and re-enable email confirmation before opening signups to strangers.
- Signups always create client accounts; the prod coach account was created via the Auth admin API with `role: coach` metadata.

## Changing app text

All user-facing copy lives in `src/content/copy.json`; see [docs/how-to-change-text.md](docs/how-to-change-text.md) for the non-developer workflow.

## Tests

```bash
npm run test:e2e      # requires the seeded demo accounts
npm run test:e2e:ui
```

The suite signs in as the demo coach and demo client (see `e2e/credentials.ts`) and runs against the dev server on port 3000, which Playwright starts automatically.
