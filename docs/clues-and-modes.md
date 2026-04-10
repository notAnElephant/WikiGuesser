# Clues By Category And Mode

This document describes the current normalized clue sets defined in [`src/lib/content/category-definitions.ts`](/Users/oraisz/code/webdev/WikiGuesser/src/lib/content/category-definitions.ts).

## How To Read This

- `All modes` means the clue can appear in both `classic` and `blurred-lines`.
- `Blurred-lines only` means the clue is excluded from `classic`.
- `Late reveal` means the clue is held back until the end of the normal reveal order.
- The live product currently exposes `countries` and `cities`. `people` is still defined in code and included here for completeness.

## Countries

Minimum playable clues: `5`

### All Modes

1. `Continent`
2. `Area`
3. `Population`
4. `Currency`
5. `Capital` (`late`)

### Classic

`classic` uses the full countries clue set. There are no countries clues that are exclusive to `blurred-lines`.

### Blurred-Lines

`blurred-lines` also uses the full countries clue set.

## Cities

Minimum playable clues: `4`

Cities also require at least `4` `classic`-eligible clues, so `blurred-lines`-only clues cannot make a city playable by themselves.

### All Modes

1. `Continent`
2. `Population`
3. `Nickname`
4. `Closest capital`
5. `Famous location`

### Classic

`classic` uses only the shared city clues:

1. `Continent`
2. `Population`
3. `Nickname`
4. `Closest capital`
5. `Famous location`

### Blurred-Lines

`blurred-lines` uses the shared city clues plus these extra clues:

1. `GDP per capita`
2. `Mayor`
3. `Famous location`

## People

Minimum playable clues: `5`

### All Modes

1. `Occupation`
2. `Citizenship`
3. `Birth decade`
4. `Field`
5. `Education`
6. `Award` (`late`)

### Classic

`classic` uses the full people clue set.

### Blurred-Lines

`blurred-lines` currently uses the same people clue set as `classic`.
