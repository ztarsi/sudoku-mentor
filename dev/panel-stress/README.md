# The Techniques panel, against worst-case data

A dev-only harness that renders the real panel, the real reference dialog
and the real lesson dialog against a catalog of any size and the kinds of
data a component is never designed for. It exists because three interface
defects in a row came from the same cause: the panel was designed against
sixteen techniques and shipped against sixty-one, and nothing in a suite of
860 tests could see a wall of rows that were each individually correct.

It follows the `break-ui` skill in `.claude/skills/break-ui`: the worst case
enters through the same boundary the real data does, and not one line of the
components changes between the states.

## Running it

```
npx vite --config dev/panel-stress/vite.config.js --port 4178
```

Then open <http://localhost:4178/>. A toggle at the bottom switches between
**Demo data**, **Worst case**, **Empty**, **One**, **All of them**,
**Scanning** and **No Assist**; the choice is in the URL, so a reload keeps
it. `?catalog=183` sets the catalog size (the default is three times
today's) and `?tiers=closed` starts with the ladder collapsed.

To measure every state at every supported width and screenshot them:

```
NODE_PATH=$(npm root -g) node dev/panel-stress/measure.mjs
```

Playwright is not a dependency of this project; the script uses whatever the
machine has. It writes `dev/panel-stress/shots/`, which is not committed.

## How the catalog is replaced

`vite.config.js` aliases every import of `techniqueCatalog` to
`stressCatalog.js`, which re-exports the real one with synthetic techniques
appended. The panel is byte-identical to the one players get; only its data
is worse. Synthetic techniques have no reference text, so opening one shows
nothing - that is the stand-in, not a defect.

## What is in the worst case

Values a real catalog could plausibly hold, never nonsense: a sixty-two
character chain name with no short form, a hyphenated fish variant with no
break opportunity, a one-letter name, a technique with every optional field
missing, one with diacritics and a Japanese alias, a count of 9,999, a count
of 1,284, a count of exactly 1, a scan that has just finished, and a grid
with more than one answer so a third of the catalog is unavailable.

## Why it stays

It is the regression test for the next person who touches this panel, and
the only thing in the repository that can answer "what does this look like
at a hundred and eighty-three techniques" without shipping them first. It is
outside `src/`, so lint, typecheck, the production build and Tailwind's
content globs never see it.
