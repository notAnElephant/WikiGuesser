# WikiGuesser

Fast Wikipedia-inspired guessing game built with Next.js, Prisma, Clerk, and a Wikidata/Wikipedia snapshot pipeline.

## Current Product

- Daily challenge: one shared puzzle per category/mode each day
- Live categories: `countries`, `cities`
- Modes: `classic`, `blurred-lines`
- Theme: dark by default, user-toggleable
- Auth: Clerk
- Analytics: Vercel Analytics

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
npm install
```

2. Configure environment variables:

- `DATABASE_URL`
- `ROUND_TOKEN_SECRET` (optional in local development; falls back to a local default)

3. Start the app:

```bash
npm run dev
```

## Useful Commands

```bash
npm run typecheck
npm test
npm run prisma:generate
npm run prisma:migrate:deploy
npm run ingest:discover
npm run ingest:discover:countries
npm run ingest:discover:cities
npm run ingest:discover:people
npm run ingest:hydrate
npm run ingest:hydrate:countries
npm run ingest:hydrate:cities
npm run ingest:hydrate:people
npm run ingest:build-snapshot
npm run ingest:build-snapshot:countries
npm run ingest:build-snapshot:cities
npm run ingest:build-snapshot:people
npm run ingest:build-snapshot:active
npm run ingest:countries
npm run ingest:cities
npm run ingest:people
```

## Data Flow

- Content is discovered and hydrated from Wikidata + Wikipedia.
- Snapshots are persisted to Postgres.
- Runtime reads from the latest Postgres snapshot only.

## Gameplay Reference

- [Clues by category and mode](./docs/clues-and-modes.md)

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
