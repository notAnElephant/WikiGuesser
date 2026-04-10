# Content Pipeline

This project turns Wikidata entities into playable game rows in three steps:

1. `discover`
2. `hydrate`
3. `build-snapshot`

## What Each Step Does

### `discover`

`discover` finds candidate Wikidata entities for a category and stores their QIDs.

Examples:

- `npm run ingest:discover:countries`
- `npm run ingest:discover:cities`
- `npm run ingest:discover:people`

Use `discover` when the category population itself should change.

Examples:

- you changed the discovery query
- you want to include newly eligible entities
- the stored discovery results are stale

### `hydrate`

`hydrate` fetches the raw Wikidata data for the discovered QIDs and stores the allowed properties for each entity.

Examples:

- `npm run ingest:hydrate:countries`
- `npm run ingest:hydrate:cities`
- `npm run ingest:hydrate:people`

Use `hydrate` when the entity pool is the same, but the fetched data needs to change.

Examples:

- you added a new property such as `P527`
- you changed `allowedProperties`
- you changed which labels/claims the normalizer depends on

### `build-snapshot`

`build-snapshot` reads the hydrated data, normalizes it into playable entities and clues, and writes the latest live snapshot to Postgres.

Examples:

- `npm run ingest:build-snapshot`
- `npm run ingest:build-snapshot:active`

This is the step that updates the database rows the app actually reads at runtime.

## How Data Gets Into The DB

The app does not read raw discovery or hydration output at runtime.

Instead:

1. `discover` writes generated QID files
2. `hydrate` writes generated hydrated entity files
3. `build-snapshot` converts those into normalized playable entities
4. `persistSnapshot()` writes the final snapshot into Postgres

Runtime gameplay, daily challenges, and category counts all read from the latest persisted snapshot in the database.

## When You Need To Rediscover

You usually do **not** need to rediscover when you add a new clue or a new property.

Examples that do **not** require rediscovery:

- adding a new clue for an existing category
- adding a new allowed property for an existing category
- changing clue ordering
- changing clue labels
- changing normalization rules

In those cases, the normal workflow is:

1. re-hydrate the changed category
2. rebuild the active snapshot

Example:

```bash
npm run ingest:hydrate:countries
npm run ingest:build-snapshot:active
```

You **do** need to rediscover when the set of candidate entities should change.

Examples:

- changing the discovery query
- expanding or narrowing which entities belong to the category
- refreshing stale discovery output to include newer eligible entities

## Safe Workflow

Partial hydration is safe.

Partial snapshot persistence is not.

The safe workflow is:

1. Re-hydrate only the categories you changed.
2. Rebuild the combined live snapshot with `npm run ingest:build-snapshot:active`.

Example:

```bash
npm run ingest:hydrate:cities
npm run ingest:build-snapshot:active
```

Do not treat a single-category snapshot build as a production-safe publish step. The live snapshot stored in Postgres should contain the full active category set.
