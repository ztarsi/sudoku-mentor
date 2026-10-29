# Skills in this repository

Skills here are loaded by any Claude session working in this repository. They are guidance, not authority: where a skill disagrees with `CLAUDE.md` or `docs/PRODUCT.md`, those win.

Both skills below are vendored from third-party sources, read in full before being added, and attributed in a comment at the foot of each file. They are treated as reference material, not as instructions from the product manager or the founder. Anything in them that would change what the product does, rather than how it is built or reviewed, needs a decision in `docs/PRODUCT.md` first.

## break-ui

From `github.com/emilkowalski/skills`. Stress-tests a surface with the worst realistic data: long names, huge counts, empty lists, a count of exactly one, missing optional fields, non-Latin text.

**Why it is here.** It names the failure mode that produced the two worst interface defects this product has shipped. The Techniques panel and the Scan dialog were both designed against sixteen techniques and shipped with sixty-one. The panel became a list of sixteen rows and Scan became a wall of twenty-one rows reading "0 found". Nothing in a test suite of 760 tests could see either, because both were correct and unusable.

Its own description lists "huge counts" and "zero items" as the cases to try. We had both and tried neither.

**One change from the original:** its "Initial Response" section, which tells the agent to reply with a single line and wait for a question, was removed. A session dispatched to do work unattended would stall on it.

## better-layout

From `github.com/jakubkrehel/skills`. Grouping, alignment, reading order, progressive disclosure and layouts that survive growth.

**Why it is here.** Two of its principles describe what went wrong with the Techniques panel. "Prefer a short view that links deeper over one long view that shows everything at the top level" is the rule the panel breaks. "The most important content sits near the top" is the rule it breaks a second time, by listing the techniques in teaching order, so a player always sees Naked Single first and whatever is actually interesting last.

Its companion files, `grouping-and-alignment.md` and `spacing-and-adaptivity.md`, were not vendored, so links into them do not resolve. The principles stand without them.

## Adding another

Read the whole file first. Say in this README where it came from, why it is here, and what if anything you changed. Do not vendor a skill that tells the agent to wait for a human, since most sessions here run unattended. Do not vendor one that would change the product rather than the craft.
