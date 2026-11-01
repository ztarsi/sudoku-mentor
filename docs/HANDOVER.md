# Handover: everything the next product manager needs

Written 26 October 2026 by the outgoing product-manager session, last updated 29 October, for an agent starting fresh on a different Claude account. It assumes you have the repository and nothing else: no memory, no sessions, no routines.

Read this file, then `docs/PRODUCT.md`, then `CLAUDE.md`, then `docs/STAGING.md`. Everything else is reference.

---

## 1. What the product is

Sudoku Mentor teaches Sudoku technique by technique, on the puzzle in front of the player, instead of filling cells in for them. Two promises carry the whole thing, and they are in `docs/PRODUCT.md` section 5:

1. **Every hint is a lesson.** A hint names the technique, shows the cells on the board, and explains the reasoning in plain English. It never just places a digit.
2. **Every hint is honest.** A step is presented as a named technique only when it is one. Where the mentor has to reason by trial, it says so, and the player can see the difference at a glance.

The player it is built for is "the improver": someone who can finish an easy puzzle and stalls on a hard one. The learner and the enthusiast are served either side of them. Section 3 has all three.

The founder is **Ziv** (ziv@tikali.ai). He is the decision-maker on everything. He does not write code and reads product reasoning, not implementation detail. He is a product manager of thirty years and understands algorithms and protocols, so do not over-explain the technical parts; do explain the product reasoning.

## 2. Your job, if you are the product manager

What the outgoing session owned:

- **`docs/PRODUCT.md`** is the source of truth: what the product is, the quality bar, the roadmap in Now / Next / Later buckets, the risks, and a dated decision log, newest first. Keep "Last reviewed" current.
- **`docs/specs/`**, one spec per issue. The house format is: the player problem, the outcome we want, done from the player's side, out of scope, how we will know it worked, and an Outcome section appended when it ships. Specs say *what* and *why*; the developer decides *how*.
- **`docs/reviews/`**, dated reviews with evidence.
- **One GitHub issue per spec**, labelled with its roadmap bucket (`next` is the label that exists).
- **Verification from the player's side** when something ships, with the result recorded in the spec and the decision log.
- **Prioritisation with one recommendation**, not a menu of options.

Working rules the founder set: docs work goes on branches named `claude/pm-<topic>`, opens a pull request against `staging`, and you merge it yourself once CI is green. Never push to `main`. **Never edit anything under `src/`** — that is the developers' side of the line, and it matters because the line is what lets several sessions work at once. Never invent a metric; if a number is not measured, say it is not measured.

## 3. How the code gets written

You do not write it. You dispatch developer sessions and verify what they produce.

- **One session per batch of work**, created fresh from `staging`, with a prompt that stands completely alone: what to read, what the batch is, what done means, the decisions already taken so they do not have to ask, what not to touch, and how to ship it. The prompts in this session's history are the model; they ran to completion without a single clarifying question.
- Sessions are created with the `create_session` tool against the account's environment, with `source_url` pointing at the repository and **`source_revision: "staging"`** (not `main`, which lags).
- **Sessions stop after merging their pull request**, by instruction. They comment on their issue with what changed, the numbers, what is worth checking, and any call they made.
- **Keep at most two sessions in flight** when both edit the technique ladder, the technique catalog or the oracle test, which most batches do. Three branches touching those three files spend their time resolving conflicts. A batch that touches different files, such as a report or a UI-only change, can run alongside.
- **Check in on a timer** with the `send_later` tool, roughly every 45 minutes, with a message to yourself naming the sessions in flight and what to do when each lands. That pattern worked well; without it the work stalls silently.

None of the session IDs or routine IDs from the old account will work on yours. Start fresh and ignore any that appear in the git history.

## 4. Branches, and the one thing that will bite you

Read `docs/STAGING.md` in full. The short version:

- **Every pull request targets `staging`.** Nothing goes to `main` except a release.
- **`main` is the deploy branch.** Base44 is the platform the app runs on, and it only sees `main`.
- **The Base44 platform bot pushes straight to `main`,** with no pull request, whenever the founder works in the Base44 editor. This is by design and must not be blocked.
- **A release is one pull request from `staging` to `main`,** merged after CI is green and the play-and-learn loop has been verified on staging. Merging does not publish: the Base44 checkpoint is deployed as a separate step, from the Base44 dashboard, by the founder.
- **After any bot push to `main`, merge `main` into `staging` before doing anything else.**

**The thing that will bite you:** that last rule is easy to skip and expensive to skip. On 25 October we found eight bot commits on `main` that `staging` had never seen, including an X-Cycle hint animation and the removal of the desktop pencil button. They conflicted in three files the coverage programme had just rewritten. Check `git log --oneline origin/staging..origin/main` at the start of every session. If it prints anything, deal with it first.

The staging site is **https://sdm.pilia.net**, a Cloudflare tunnel to the founder's own server, which runs `scripts/deploy-staging.sh` every few minutes to pull `staging`, build, and serve `dist/`. **There is no Base44 behind staging,** so it runs anonymous: no sign-in, saved puzzles, solve records, best times or photo import. Everything else works. Hard-reload once after a deploy so the service worker picks up the new build.

The live app is **https://sudoku-mentor-cd8c3b71.base44.app**.

Before every push, four checks, all of which must pass:

```
npm run lint        # warnings are errors
npm run typecheck   # tsc over the JS
npm test            # vitest, includes the solution oracle
npm run build
```

## 5. Where the product stands today

Updated 1 November 2026.

### Shipped to players

The **UX pass** was released from `staging` to `main` on 19 September as pull request #61: one adaptive page replacing a separate mobile page, one digit strip at every width, designed hint-card states, a header in words with one menu, dark and paper themes, and inline onboarding prompts instead of a modal tour.

### Complete on `staging`, not yet released

Everything below is merged to `staging` and was verified there by driving https://sdm.pilia.net in a browser, not by reading pull requests. **None of it is on `main`.** The release is the next big step and needs the founder's go (section 6).

- **The technique coverage programme** (#69, batches #67, #70 to #75, #82, #83): 16 techniques to 61, and every one of the library's solve-path steps explained by a named technique.
- **The hint animation template** (#97) and the reconciliation of `main` into `staging` (#98).
- **The 29 October UX review's findings**: hint focus and announcement, menu focus, library names, contrast (#109); Scan as an answer rather than an animation (#105); the board, strip and library pass (#107); the Techniques panel opening short (#114, #122); counting only the easiest tier with something on it (#128); count budgets that assert the right promises (#100, #117).
- **1 November**, all in one session at the founder's word "do all of it now":
  - What loads before the first board (#91, PR #130): 908 kB to 630 kB, the first digit on a throttled phone at 3.9 s instead of 4.7 s, and CI budgeting that payload rather than the total.
  - Unique Loop made cheap (#125, PR #131): 637 ms to under 2 ms, proved identical on 348 grids.
  - Undo survives a reload (#106, PR #132).
  - Three puzzles renamed without losing best times, and the naming rule as a test (#79, PR #133).
  - The library's labels precomputed and held to the live analyser by a test (#95, PR #134): 18 s to 15 ms on the Ultimate shelf.
  - Scan retired: every tier counted in a background worker (#126, PR #135).
  - Teaching coverage (#88, PR #136): 52 of 60 techniques taught at least twice, from 25; the library is 48 puzzles. Check whether #136 is merged before you start: it was green-pending when this was written.

### What is still unverified

Everything that depends on the Base44 platform: sign-in, saved puzzles, solve records, best times, photo import. Staging has no platform behind it, so none of these can be checked until a release reaches the live app. #79 changed how best times are looked up (a renamed puzzle is looked up under every name it has had), so best times are the first thing to spot-check after the release.

## 6. What is open, in the order I would take it

1. **Release `staging` to `main`,** on the founder's go. It carries everything in section 5. Then he deploys the Base44 checkpoint, and the five platform-dependent features get spot-checked on the live app, best times first.
2. **The last eight techniques of #88.** Remote Pairs, Avoidable Rectangle Type 2, BUG+1, +2, +3, Mutant Fish and Continuous Loop were never once the hint in 133,000 generated boards, and Digit Forcing Chain is taught by one puzzle. This is now a decision for the founder rather than a search: accept them as redundant on real boards (the spec's own rule), or build practice mode, where a position is chosen so the technique is the next step.
3. **The Ultimate shelf is 28 puzzles long.** It works, but it may want grouping by what each puzzle teaches, which is also the first half of practice mode.
4. **#35, library and completion,** the oldest open spec.
5. From the roadmap: learning on the phone (the phone is No Assist until it is answered), graduated hints, analytics, full offline play. The service worker caches what it has fetched, so the mentor works offline once it has been loaded online, but nothing is precached.

## 7. Decisions already made. Do not re-litigate these.

The full log is `docs/PRODUCT.md` section 13, newest first, with reasons. The ones a new agent would most likely trip over:

- **One adaptive page**, not a separate mobile page. Founder, 18 September.
- **The phone is always No Assist**, a "just play" surface, until the open question of what teaching looks like on a phone is answered.
- **Auto-solve was removed** and is not coming back. The product teaches; it does not solve for you.
- **Secondary controls live behind one hamburger menu**, and nothing in the header is icon-only except the menu itself.
- **In-context onboarding prompts, not a modal tour.** The tour blocked the board on arrival, which is the opposite of the quality bar.
- **Shelves are re-cut once, deliberately, not batch by batch.** Re-cutting as the mentor improves would move puzzles under players partway through them and make best times incomparable.
- **In No Assist the Techniques list stays readable but inert:** no counts, no Scan, no Search, with every reference dialog still openable. Reading how a technique works is studying, not being helped.
- **The hint's ten-node cap on a chain stands,** and the panel is aligned to it rather than to the deeper Scan. Ten links is already at the limit of what a person can follow, and coverage for its own sake is not the goal.
- **A proof by cases is presented as a deduction.** The Forcing tier holds five techniques that check every option; the what-if card belongs to Hypothesis Mode alone, which says that only one candidate was tested.
- **Uniqueness techniques only fire on a puzzle known to have exactly one answer.** A grid with two answers is played rather than refused: the mentor says so, keeps teaching, and switches off that family with the reason shown.
- **"What this puzzle teaches" is a label that moves.** It describes what the mentor will show you today, not a property of the puzzle. The shelf is the stable promise.
- **The forcing net's depth limit is five,** chosen by measurement: the lowest depth at which every library puzzle can be finished by name.
- **The Base44 hint animation is the template** for all animations. Founder, 26 October.
- **CI budgets what loads before the first board, not the total** (#91). 680,000 bytes, with the reason beside the number in `scripts/bundleClosure.js`. The total is reported, never enforced: splitting code is the change that helps a player, and a total punishes it. Do not raise the first-board number to make something fit; move the thing out of the first board.
- **There is no Scan button.** Every tier but the search-only ones is counted in a background worker, easiest first, stopping at the first tier with something (#126, #128).
- **The hint's ten-node cap applies to colourings too** (`fitsAHint`). A longer proof is counted but not offered as the next lesson.
- **Undo survives a reload,** up to 500 moves back and 500 forward, saved as only what each move changed (#106).
- **A puzzle's name may not name a technique it does not need,** and renaming a puzzle keeps its former names so best times are not orphaned (#79).
- **The shelves were re-cut once, on 1 November, and nothing moved.** Every puzzle rates exactly its shelf, and a test holds that.

## 8. Hard-won lessons

- **Write a spec's technique definitions from a worked example, not from memory.** Three of the outgoing session's specs had errors the developers found by implementing them: a Unique Rectangle Type 5 that could never have eliminated anything, a Type 2 that described Type 1's shape, and a Double Forcing Chain whose definition contradicted its own honesty table. Each cost a developer real time. This was the single biggest process failure of the programme.
- **Measure, then claim.** The outgoing session wrote in the decision log that no library puzzle reached XYZ-Wing. It was taught once, at step 18 of Swordfish Hunt, and the existing report could not see it because that report names only each puzzle's hardest technique. The correction is in the log. Build the report before making the claim.
- **A good developer session raises problems rather than hiding them.** The ones here flagged a raised bundle budget, deferred a requirement they could not meet well and filed it, proved a negative result with measurements rather than guessing, and corrected the spec writer. Ask for that behaviour explicitly in the prompt and you get it.
- **Check whether a pull request actually went green before declaring the build blocked.** I filed an issue calling CI red, told a developer session to fix it first, and left my own docs pull request unmerged for three days. It had gone green three minutes after I filed, and the fix I said was missing was already in a commit I had read past. The session was right to stop and say so rather than change a product budget on a premise it could see was false. Two lessons: re-check before you escalate, and a developer session that pushes back with measurements is doing its job.
- **A spec is no use on an unmerged branch.** The animation template was built from an issue body because the pull request carrying its spec was sitting unmerged. It came out well, and that was luck. Merge the spec before dispatching the work that depends on it.
- **A performance test on a shared runner measures the runner too.** Two of them have now been borderline, and the fix is to measure less noisily or to assert the budget that actually applies, never to raise the number so the build goes green. A budget with no reason written beside it gets nudged; a budget with a reason gets defended.
- **The oracle tests are the safety net for the whole product.** `oracleAll.spec.js` and `oracle.spec.js` check every instance of every technique, on every intermediate grid of every library puzzle, against that puzzle's true solution. A change that makes one fail is wrong until proven otherwise. Never weaken them to go green.
- **A technique with only an engine is not done.** Plain wording, Expert wording and a reference entry ship in the same change, every time. The plain wording for a new size or variant should read as the one the player already knows, one size up.
- **Do not commit `package-lock.json`** as a side effect of running `npm install`. Use `npm ci`.
- **`src/pages/OAuthConsent.jsx` and `src/components/AuthLayout.jsx` are platform-generated.** Leave them alone; lint and typecheck skip them.
- **Cells are named `R5C3`** everywhere, with a legend in the hint card.
- **No model identifiers** in commits, code, comments or anything pushed to the repository.
- **Run `/code-review` on every change, and fix what it finds before merging.** On 1 November it found real defects in every one of seven pull requests, including two behaviour bugs I had introduced and one fix of mine that broke on an identity lookup. Then run the suite again: the tests caught the last of those.
- **More data finds more bugs.** Twenty puzzles had never produced a colouring longer than a hint may show; forty-eight did at once. When the library grows, expect the engine tests to find things, and treat each as a finding, not as a test to loosen.
- **A slow test suite on a busy machine reads as a broken one.** The oracle and library tests sit near vitest's 30-second limit. Do not run a generator or a second suite beside them and then believe a timeout. Split a test that walks the whole library into one case per puzzle rather than raising a limit.

## 9. The analyser, which is your instrument

`npm test` prints two reports that are the product's conscience. Both came out of batch #71 and #83.

1. **Per-shelf coverage:** for each shelf, how many solve-path steps a named technique explains, and how many fall to trial. Currently 1303 of 1303, every shelf at 100%.
2. **Which techniques the library never teaches:** for every technique in the catalog, whether any library puzzle's path uses it as a step. Currently 32 taught, 29 never the hint.

Judge any claim about the engine against the first and any claim about teaching against the second. The library's row labels, "Teaches up to X", come from the same analysis rather than from a hand-written label, so a shelf cannot claim something the engine does not do.

## 10. File map

| Path | What it is |
| --- | --- |
| `docs/PRODUCT.md` | Source of truth: product, quality bar, roadmap, risks, decision log |
| `docs/STAGING.md` | Branches, the staging server, the release checklist |
| `CLAUDE.md` | The rules every session reads first, written by the developer side |
| `docs/specs/` | One spec per issue, each with an Outcome section once shipped |
| `docs/reviews/` | Dated reviews with evidence, including the September UX review and its screenshots |
| `src/components/sudoku/logicEngine.jsx` | The teaching ladder and the per-technique dispatch |
| `src/components/sudoku/techniqueCatalog.js` | Display metadata, tiers, and all teaching text |
| `src/components/sudoku/stepShape.js` | The shape every step the engines emit must have |
| `src/components/sudoku/__tests__/oracleAll.spec.js` | The solution oracle, the safety net |
| `src/components/sudoku/hintAnimation.js` | The animation template's frame store and X-Cycle builder |
| `scripts/deploy-staging.sh` | What the founder's server runs every few minutes |

## 11. Setting up your account

Things that are account-scoped and will not carry over:

- **GitHub access.** The repository is `ztarsi/sudoku-mentor`. If a tool reports it inaccessible, the founder connects GitHub at https://claude.ai/connect-github and the Claude GitHub App is installed per repository.
- **Session IDs and routines.** Everything referenced in this session's history is dead on your account. List your own environments before creating sessions, and create your own check-in reminders.
- **Network access.** Reaching the staging URL from a cloud session needs `sdm.pilia.net` allowed by the environment's network policy. The founder set the environment to full internet access in September to get there; narrowing it back to an allowlist with that host is tidier and was recommended but never done.
- **Base44.** There is a Base44 connector with tools for the platform side. The developer sessions did not need it, and deploying the checkpoint was refused as a production deploy, so the founder does that from the dashboard.

## 12. The two things to tell the founder early

1. **The coverage programme worked and the library is now the bottleneck.** The mentor knows 61 techniques and the library puts 32 of them in front of a player. Fixing that is puzzles, not code, and it is where the next real gain is.
2. **Nothing has been played.** The engine is verified by tests to a standard most products never reach, and the experience of it is entirely unverified. Twenty minutes on https://sdm.pilia.net with a Diabolical and an Ultimate puzzle, at desktop and phone width, is worth more than another batch of techniques.
