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

The running services belong to the app's owner (Supabase org and Vercel team both named **DG Coaching**). The code stays in this repo.

| Env | Supabase project | Used by |
| --- | --- | --- |
| Prod | `8dimitar's Project` (`lvvhcdffnojfmritptca`, `eu-west-1`) | the live site, real accounts only (no demo seed) |
| Test | `fitcoach-test` (`jtukkwtraklzovuxvngi`, `eu-west-1`) | local `npm run dev`, e2e tests, seeded demo data |

- The frontend is the Vercel project `dg-coaching` in team `dg-coaching` (Hobby). Live at **https://dg-coaching.vercel.app**. "FitCoach" is only the internal name.
- **Deploys run from GitHub Actions**, not Vercel's Git integration: `.github/workflows/deploy.yml` builds on every push to `main` (or a manual run) and uploads the prebuilt output with the Vercel CLI. Vercel cannot import a personal repo its account does not own, so the Git integration is not an option. The workflow needs the repo secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`. If the owner revokes the token, deploys fail until a new one is stored.
- **Known blocker (2026-09-29):** Vercel Hobby also applies its commit-author check to CLI deploys. The CLI sends the commit author with each deployment, and any commit not authored by the team owner is marked `BLOCKED` (`TEAM_ACCESS_REQUIRED`). Only the very first deployment went through. Until this is resolved (Pro plan with the developer as a team member, or another agreed approach), pushes to `main` do not reach production.
- Production only. There are no preview deployments; the test project is never wired to Vercel.
- Vercel holds `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` for the Production environment, and the workflow pulls them at build time. The key is the project's **publishable** key (`sb_publishable_…`). `.env.local` keeps local dev on the test project.
- Schema changes: files in `supabase/migrations/` are applied to each environment via the Supabase SQL/query API (or `supabase db push`), test first, prod after the change ships.
- Prod auth currently **auto-confirms** signups (Supabase's built-in mailer only delivers to team members). Set up custom SMTP and re-enable email confirmation before opening signups to strangers. If the site gets a custom domain, update the auth site URL and redirect allow-list to match.
- Signups always create client accounts. To make a coach, have them sign up in the app, then set `role = 'coach'` on their `profiles` row.
- Both Supabase projects are on the free tier: they pause after about a week without traffic and have no backups.

## Changing app text

All user-facing copy lives in `src/content/copy.json`; see [docs/how-to-change-text.md](docs/how-to-change-text.md) for the non-developer workflow.

## Tests

```bash
npm run test:e2e      # requires the seeded demo accounts
npm run test:e2e:ui
```

The suite signs in as the demo coach and demo client (see `e2e/credentials.ts`) and runs against the dev server on port 3000, which Playwright starts automatically.
