# Working on Sudoku Mentor

Read `docs/PRODUCT.md` for what the product is and `docs/ARCHITECTURE.md` for how the code is organised. The process below is decided in `docs/STAGING.md`.

## Branches

- **Every pull request targets `staging`, never `main`.** Work on a feature branch, open the PR against `staging`, merge it yourself once CI is green.
- **`main` is the deploy branch.** Base44 only sees `main`. It receives release pull requests from `staging`, and the Base44 platform bot's own boilerplate pushes. Never push work to `main` directly.
- **A release is one pull request from `staging` to `main`**, opened by the developer with a short note of what it carries, merged after CI is green, the play-and-learn loop has been verified on staging, and the Base44-dependent features (sign-in, saved puzzles, solve records, best times, photo import) have been spot-checked on the live app after deploy. Merging to `main` does not publish: the Base44 checkpoint is deployed as a separate step.
- **When the platform bot pushes to `main`, merge `main` into `staging`** before the next PR, so a release never carries a surprise.

## Staging

- URL: **https://sdm.pilia.net** (Cloudflare tunnel to the founder's server). The server runs `scripts/deploy-staging.sh` every few minutes: it pulls `staging`, builds, and serves `dist/` as a static site with SPA fallback.
- There is **no Base44 behind staging**. The app runs in anonymous mode: sign-in, saved puzzles, solve records, best times and photo import are not available there. The play-and-learn loop, the library, text import, hints and the timer all are.
- **To verify a change on staging:** merge its PR into `staging`, wait a few minutes, open the URL (hard-reload once so the service worker picks up the new build), and check the change from the player's side on a desktop width and a phone width. The product manager verifies from the spec in `docs/specs/` and records the outcome.
- If a cloud session cannot reach the URL, its environment's network policy needs `sdm.pilia.net` allowed (see `docs/STAGING.md`). Until then, verify against a local production build: `npm run build && npx vite preview --port 4173`.

## Before every push

```
npm run lint        # eslint, warnings are errors
npm run typecheck   # tsc over the JS
npm test            # vitest, includes the solution-oracle tests for every technique
npm run build
```

All four must pass. The oracle tests (`oracleAll.spec.js`, `oracle.spec.js`) are the safety net for every hint the mentor gives: a change that makes one fail is wrong until proven otherwise.

## Conventions

- Specs live in `docs/specs/`, one per issue; they say what and why, the developer decides how. `docs/PRODUCT.md`, `docs/reviews/` and `docs/specs/` belong to the product manager; do not edit them from a developer session. When a spec is ambiguous, ask on the issue and move on to the next one.
- When a PR is merged, comment on its issue with the PR number and what changed, so it can be verified on staging.
- No model identifiers in commits, code or comments.
- Explanations shown to players are plain English for beginners first, with the Expert wording behind the toggle; cells are named `R5C3`.
- `src/pages/OAuthConsent.jsx` and `src/components/AuthLayout.jsx` are platform-generated; leave them alone (lint and typecheck skip them).
