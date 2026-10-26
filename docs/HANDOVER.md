# Handover: everything the next product manager needs

Written 26 October 2026 by the outgoing product-manager session, for an agent starting fresh on a different Claude account. It assumes you have the repository and nothing else: no memory, no sessions, no routines.

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

### Shipped to players

The **UX pass** was released from `staging` to `main` on 19 September as pull request #61: one adaptive page replacing a separate mobile page, one digit strip at every width, designed hint-card states, a header in words with one menu, dark and paper themes, and inline onboarding prompts instead of a modal tour. Seven specs, issues #28 to #34, plus three follow-ups.

### Complete on `staging`, not yet released

The **technique coverage programme**, issue #69, spec `docs/specs/technique-coverage.md`. Seven batches, all merged and verified, 24 and 25 October. The result:

| | Before | After |
| --- | --- | --- |
| Techniques in the catalog | 16 | 61 |
| Library steps explained by a named technique | 1204 of 1245 | **1303 of 1303** |
| Ultimate shelf steps answered by trial | 41 | **0** |

Every step of every one of the twenty library puzzles is now explained by a named technique. Hypothesis Mode, the trial-and-error fallback, still exists for imported puzzles the proofs cannot finish, which is the honest last resort it was always meant to be.

The batches, for the record: subsets and wings (#70), the Techniques panel at scale plus the difficulty analyser (#71), alternating inference chains (#67), fish and single-digit patterns (#72), almost locked sets (#73), uniqueness (#74), forcing chains and nets (#75). Plus the never-taught report (#83) and walkable colouring (#82).

### The verification gap you are inheriting

**Nobody has played any of it.** Every verification recorded for the coverage programme is the test suite and the difficulty analyser. That is strong evidence the hints are *correct* and no evidence that the cards *read well*, that the two colour tints survive the paper theme, or that a 61-technique panel is usable at phone width. Each batch's issue comment ends with a "worth checking on staging" list. None of those lists has been walked by a human or by a browser session.

If you do one thing first, do that.

## 6. What is open, in the order I would take it

1. **#98, reconcile `main` into `staging`.** Decided, dispatched 26 October, and release-blocking. Keep the Base44 animation, keep the walk's words, restore the desktop pencil button. The issue has the full resolution.
2. **#97, the hint animation template.** Founder decision of 26 October: the animation he built in the Base44 editor is the template, and all animations follow it as far as possible. Spec is `docs/specs/hint-animation.md`. Dispatched with #98, to be done after it.
3. **Play the thing on staging**, per section 5.
4. **#88, teaching coverage.** This is the biggest gap in the product and the most interesting problem left. The library teaches **32 of the 61** techniques; 29 are never the hint on any puzzle, X-Wing among them. That number was 10 of 31 before the programme: the engine moved and the library did not, so the gap widened as the programme succeeded. A mentor that knows 61 techniques and teaches 32 is not a better teacher than one that knows 32. Spec is `docs/specs/teaching-coverage.md`; the target is every technique taught by at least two puzzles, and it is mostly puzzle sourcing, gated by the analyser.
5. **#91, what a player downloads before the first board.** The build is about 956 kB of JavaScript against a quality bar that promises a digit within ten seconds on a phone, and every technique engine loads before the board. The CI check sums every chunk, so lazy loading cannot move it, which is the actual bug. Spec is `docs/specs/first-board-payload.md`. **Do not raise that budget again.**
6. **#95**, the library's Ultimate shelf takes 13 seconds to label its rows, because it re-measures twenty fixed puzzles on every visit.
7. **#79**, two puzzle names promise techniques their puzzle never needs: "X-Wing Territory" on Easy needs only a Hidden Single, and "Swordfish Hunt" never needs a Swordfish.
8. **The shelf re-cut** the programme deferred. Six library puzzles' hardest technique moved during it. Decide with the analyser's numbers whether any puzzle is on the wrong shelf.
9. **A release to `main`,** on the founder's go, once the above is in order. Then he deploys the Base44 checkpoint and the five platform-dependent features get spot-checked on the live app: sign-in, saved puzzles, solve records, best times, photo import. Staging cannot test those.

**#100, CI is red on `staging` right now.** The almost-locked-set timing test fails on the shared runner: ALS-XY-Wing's count cost measured 161 ms against a 150 ms bar, while passing locally at about 105 ms. It blocks every pull request, including docs-only ones, so it is first in practice whatever the order above says. The issue has three ways to fix it and the two constraints that matter: the 150 ms bar is a promise that the board never stutters while a player enters digits and must not be raised for a live-counted detector, and a test that changes which budget it asserts has to say which one and why.

Also still open from earlier: #35, library and completion.

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

## 8. Hard-won lessons

- **Write a spec's technique definitions from a worked example, not from memory.** Three of the outgoing session's specs had errors the developers found by implementing them: a Unique Rectangle Type 5 that could never have eliminated anything, a Type 2 that described Type 1's shape, and a Double Forcing Chain whose definition contradicted its own honesty table. Each cost a developer real time. This was the single biggest process failure of the programme.
- **Measure, then claim.** The outgoing session wrote in the decision log that no library puzzle reached XYZ-Wing. It was taught once, at step 18 of Swordfish Hunt, and the existing report could not see it because that report names only each puzzle's hardest technique. The correction is in the log. Build the report before making the claim.
- **A good developer session raises problems rather than hiding them.** The ones here flagged a raised bundle budget, deferred a requirement they could not meet well and filed it, proved a negative result with measurements rather than guessing, and corrected the spec writer. Ask for that behaviour explicitly in the prompt and you get it.
- **A performance test on a shared runner measures the runner too.** Two of them have now been borderline, and the fix is to measure less noisily or to assert the budget that actually applies, never to raise the number so the build goes green. A budget with no reason written beside it gets nudged; a budget with a reason gets defended.
- **The oracle tests are the safety net for the whole product.** `oracleAll.spec.js` and `oracle.spec.js` check every instance of every technique, on every intermediate grid of every library puzzle, against that puzzle's true solution. A change that makes one fail is wrong until proven otherwise. Never weaken them to go green.
- **A technique with only an engine is not done.** Plain wording, Expert wording and a reference entry ship in the same change, every time. The plain wording for a new size or variant should read as the one the player already knows, one size up.
- **Do not commit `package-lock.json`** as a side effect of running `npm install`. Use `npm ci`.
- **`src/pages/OAuthConsent.jsx` and `src/components/AuthLayout.jsx` are platform-generated.** Leave them alone; lint and typecheck skip them.
- **Cells are named `R5C3`** everywhere, with a legend in the hint card.
- **No model identifiers** in commits, code, comments or anything pushed to the repository.

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
