# WikiGuesser

Fast Wikipedia-inspired guessing game built with Next.js, Prisma, Clerk, and a Wikidata/Wikipedia snapshot pipeline.

## Current Product

- Daily challenge: one shared puzzle per category/mode each day
- Duels: signed-in players can share a 3-, 5-, or 10-round asynchronous challenge
- Live categories: `countries`, `cities`
- Modes: `classic`, `blurred-lines`
- Theme: dark by default, user-toggleable
- Auth: Clerk
- Analytics: Vercel Analytics and PostHog product analytics

## Stack

- Next.js 16
- React 19
- Tailwind CSS 4
- Prisma
- PostgreSQL / Neon
- Clerk
- Vitest

## Local Development

1. Install dependencies:

```bash
pnpm install
```

2. Configure environment variables:

- `DATABASE_URL`
- `ROUND_TOKEN_SECRET` (optional in local development; falls back to a local default)
- `RESEND_API_KEY`, `FEEDBACK_NOTIFICATION_FROM`, and `FEEDBACK_NOTIFICATION_TO` (optional; together, they send an email for every submitted feedback item)
- `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` (optional; analytics stays disabled when the token is absent)
- `NEXT_PUBLIC_POSTHOG_SESSION_REPLAY=true` (optional; replay is off by default and inputs are masked)

3. Start the app:

```bash
pnpm dev
```

## Useful Commands

```bash
pnpm typecheck
pnpm test
pnpm prisma:generate
pnpm prisma:migrate:deploy
pnpm ingest:discover
pnpm ingest:discover:countries
pnpm ingest:discover:cities
pnpm ingest:discover:people
pnpm ingest:hydrate
pnpm ingest:hydrate:countries
pnpm ingest:hydrate:cities
pnpm ingest:hydrate:people
pnpm ingest:build-snapshot
pnpm ingest:build-snapshot:active
pnpm report:properties:cities
```

## Database backups

A daily, encrypted PostgreSQL backup can be stored in Cloudflare R2's free tier. Set it up with the [database backup guide](./docs/database-backups.md).

Safe snapshot workflow:

- Re-hydrate only the categories you changed, for example `pnpm ingest:hydrate:cities`
- Then rebuild the combined live snapshot with `pnpm ingest:build-snapshot:active`

## Data Flow

- Content is discovered and hydrated from Wikidata + Wikipedia.
- Snapshots are persisted to Postgres.
- Runtime reads from the latest Postgres snapshot only.

## Gameplay Reference

- [Clues by category and mode](./docs/clues-and-modes.md)
- [Content pipeline](./docs/content-pipeline.md)

## Repo Layout

- `app/` App Router pages and API routes
- `src/components/` gameplay shell and theme UI
- `src/lib/game/` round logic, reveals, scoring, answer matching
- `src/lib/content/` ingestion, normalization, snapshot building
- `src/lib/repository/` snapshot loading and persistence
- `prisma/` schema and migrations
- `tests/` Vitest coverage

## Product UI Rules

- Prefer as little visible copy as possible.
- Use iconography before helper text when the action can stay obvious.
- Preferred icon library: `lucide-react`
- Default secondary-action pattern: icon button + tooltip or accessible label
- Prefer info buttons for optional explanation instead of persistent body copy.
- Keep one clear primary action per screen.
- Permanent text should be reserved for:
  - primary CTAs
  - answer input and validation
  - destructive or irreversible actions
  - accessibility labels and true empty/error states
- If a card needs a title, description, and detail line to make sense, the interaction is too text-heavy.

## Current UI Debt

- The main menu still relies on explanatory paragraphs and multi-line mode cards instead of icon-led selection.
- The guessing flow still uses persistent helper sentences beneath the input instead of compact info affordances.
- The result modal still explains outcomes with full sentences and labeled stats, where icon chips would likely be cleaner.
- Auth entry points still carry more copy than necessary for a minimal game shell.
