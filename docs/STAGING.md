# Staging and release

How work gets from a pull request to players. Decided 2026-09-19; see the decision log in [PRODUCT.md](PRODUCT.md).

## The two branches

| Branch | Job | Who writes to it |
| --- | --- | --- |
| `staging` | Integration branch. The staging server tracks it. Every pull request targets it. | Pull requests only (developer and product manager sessions), plus merges from `main` |
| `main` | Deploy branch. Base44 only sees what is on `main`. | Release pull requests from `staging`, and the Base44 platform bot's own boilerplate pushes |

## The flow

1. All work, code and docs, goes up as a pull request against `staging`. CI runs as today. The author merges once CI is green.
2. The staging server pulls `staging` every few minutes, builds, and serves the app at the staging URL. No Base44 behind it: the app runs in anonymous mode (sign-in, saved puzzles, solve records and photo import are not available there).
3. The product manager verifies shipped changes on the staging URL from the player's side and records the outcome in the spec and the decision log.
4. A release is one pull request from `staging` to `main`, opened by the developer with a short note of what it carries. It is merged after: CI is green; the play-and-learn loop has been verified on staging; and, once deployed, the five Base44-dependent features (sign-in, saved puzzles, solve records, best times, photo import) have been spot-checked on the live app.
5. Whenever the platform bot pushes to `main`, `staging` merges `main` in, so the next release never carries a surprise.

## Staging URL

https://sdm.pilia.net (Cloudflare tunnel to the founder's local server; the tunnel is created during server setup).

## Letting the cloud sessions see the server

Claude Code on the web sessions run in a cloud environment with a network policy. To let the developer and product manager sessions open the staging URL:

1. Open the environment selector at claude.ai/code and pick the environment those sessions use.
2. Set Network access to Custom, keep the default allowed domains, and add `sdm.pilia.net`.

Without this, the cloud sessions cannot reach the server and verification falls back to running the same code locally in the session.

## Server setup brief

The one-time setup is best done by a Claude Code session running on the staging server itself, with the founder present, because it can see the machine and the cloud sessions cannot. Install Claude Code on the server, `cd` into an empty folder, run `claude`, and paste this:

> Set up this machine as the staging server for the GitHub repository `ztarsi/sudoku-mentor` (a React + Vite app). Requirements:
>
> 1. Install Node 22 and git if missing. Clone the repository into `~/sudoku-mentor` and check out the `staging` branch.
> 2. Create a deploy script that does, in order: `git fetch origin staging`, `git reset --hard origin/staging`, `npm ci`, `npm run build`. It must log to a file with timestamps and exit non-zero on any failure. Do not run it as root.
> 3. Serve the built `dist/` folder as a static site on a local port (for example 8080) with single-page-app fallback (every path returns `index.html`). Plain HTTP is fine here; Cloudflare terminates HTTPS. Caddy or nginx, running as a service so it survives a reboot.
> 4. Expose it as `https://sdm.pilia.net` with a Cloudflare Tunnel: install `cloudflared`, log in (this opens a browser; the founder completes it), create a named tunnel, route the hostname `sdm.pilia.net` to it, point the tunnel at the local port, and install `cloudflared` as a service. The zone `pilia.net` must already be on Cloudflare.
> 5. Run the deploy script every 3 minutes with cron or a systemd timer, skipping the build when `origin/staging` has not moved.
> 6. Confirm the app loads at `https://sdm.pilia.net`, shows a puzzle, and that the browser console shows the Base44 public-settings call failing and the app continuing in anonymous mode. That is expected: staging has no Base44 behind it.
> 7. Write a short `STAGING-SERVER.md` in the home folder describing what you installed, where the logs are, how to redeploy by hand, and how to restart the tunnel.
>
> Ask before installing anything outside the repository folder, and never run anything with `--dangerously-skip-permissions`.

## Before the first release

- Create the `staging` branch from `main` (done when this document was merged).
- Point the staging server at it (the brief above).
- Put the staging URL in `CLAUDE.md` (developer's task, issue #40).
- Allow `sdm.pilia.net` in the cloud environment's network policy.
- From then on, pull requests target `staging`.
