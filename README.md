# APAS · Automated Psychological Assessment Scoring

APAS is a clinical decision-support tool for licensed psychologists. It converts questionnaire responses into numerical scores and clinical signal: clinicians send patients secure, single-use assessment links (PHQ-9, GAD-7, BDI-II, or custom scales), APAS scores the responses on submit, tracks severity longitudinally, and raises alerts when thresholds are crossed — including suicidal-ideation flags that must never be missed.

> Decision support for licensed clinicians. Not a medical device, not a diagnostic tool, and never a substitute for clinical judgment.

## Features

- **Instant scoring** — standardized instruments scored the moment a patient submits, with severity classified against published thresholds.
- **Longitudinal trends** — every assessment lands on the patient's timeline; score, delta, and direction at a glance.
- **Unmissable alerts** — threshold crossings and suicidal-ideation flags surface on the dashboard and by notification.
- **Consent-first privacy** — patients are pseudonymous by default (anonymous ID + display name); identity and contact details are collected only with the patient's explicit consent, when the clinician enables it per link.
- **Custom scales** — build your own instruments alongside the built-in library; CSV templates in the repo root (`example-template-*.csv`).
- **Public site & legal pages** — landing page at `/`, drafted Privacy / Terms / Data-Retention documents under `/legal/*` (marked draft; review before publishing).
- **AI narrative summaries** — optional per-session narrative generation via the Anthropic API.

## Tech stack

Next.js 14 (App Router) · TypeScript · Prisma + PostgreSQL · NextAuth (credentials) · Tailwind CSS v4 + shadcn/ui (Radix) · Geist Sans/Mono · Jest · deployed via Railway (`railway.json`).

## Getting started

**Requirements:** Node.js ≥ 20, Yarn, a PostgreSQL database.

```bash
yarn install            # also runs `prisma generate`
# create .env with the variables below
yarn db:migrate         # prisma migrate deploy
yarn dev                # http://localhost:3000
```

### Environment variables (`.env`)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Session-signing secret (generate with `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Canonical app URL, e.g. `http://localhost:3000` |
| `ANTHROPIC_API_KEY` | Optional — enables AI narrative summaries |

Never commit `.env` — it is gitignored.

## Scripts

| Command | What it does |
|---|---|
| `yarn dev` | Start the dev server |
| `yarn build` | Production build |
| `yarn start` | Serve the production build |
| `yarn lint` | Next.js lint |
| `yarn test` / `yarn test:watch` | Jest unit tests (`__tests__/`) |
| `yarn db:migrate` | Apply Prisma migrations (`prisma migrate deploy`) |

## Project structure

```
app/                  Routes (App Router)
  page.tsx            Public landing page (signed-in users → /dashboard)
  legal/              Privacy · Terms · Data retention (public)
  auth/               Sign in / sign up / password reset
  (dashboard)/        Authenticated clinician workspace
  fill/[token]/       Patient questionnaire flow (public, single-use links)
  api/                Route handlers (patients, sessions, scales, fill, auth…)
components/           UI (shadcn primitives in ui/, feature components per domain)
lib/                  Scoring engine, alert rules, auth, prisma, notifications
prisma/               Schema + migrations
__tests__/            Jest tests for lib/
docs/                 Working notes and plans
```

## Domain notes

- **Patients are pseudonymous by default.** A `Patient` is an anonymous ID + display name scoped to one clinician. Identity fields exist but are filled only through the consent-gated details flow.
- **Assessment links** (`/fill/<token>`) are single-use and expire after 72 hours. Patients consent before anything is stored.
- **Severity vocabulary** (critical / high / moderate / low) is reserved for patient risk everywhere in the UI — see `DESIGN.md`'s Severity Monopoly Rule (kept untracked alongside `PRODUCT.md` as local design context).
