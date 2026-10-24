# Hand-over: Lane A (core loop) to Lane A2, 24 Oct 2026

Lane A built Epic S1-E3 (merged to `main` through Ghemotoc/WebApp#189) and Epic S1-E4 (below). No PR has been opened since the Actions pause; drafts are ready.

## Branches (merge strictly in this order; each is cut from the one before)

| Order | Branch | Tip | Stories | Checks | Unfinished |
| --- | --- | --- | --- | --- | --- |
| 1 | `claude/s1-e4-01a-reader` (PR Ghemotoc/WebApp#191, open) | PR head | S1-E4-01a reader, British dates | all CI green on the PR | nothing |
| 2 | `claude/s1-e4-01b-reader-budget` (PR Ghemotoc/WebApp#192, open) | PR head | S1-E4-01b budgets, 200% zoom, banner slot | local: all pass (e2e: one known language-race flake, since fixed on main) | nothing |
| 3 | `claude/s1-e4-06a-copy-off` (no PR) | `e468203` | S1-E4-06a copy off (+ a merge of `main`) | local, clean start: lint, typecheck, build, types, 66 files/387 unit tests, database PASS, e2e 429 passed / 1 skipped / 0 failed, i18n | open its PR from the draft |
| 4 | `claude/s1-e4-04-teaser` (no PR) | `f2297cf` | S1-E4-04 teaser and link previews | local, clean start: lint, typecheck, build, types, 68/399 unit, database 39 files/723, i18n; e2e 430 passed, 1 failed (Lane D's manage-chapters keyboard-drag flake; passes 3× alone) | open its PR from the draft |
| 5 | `claude/s1-e4-qa` (no PR) | `d78ec31` | S1-E4-QA epic check, the S1-E4 report, Lane A's by-hand list | local, clean start: lint, typecheck, build, types, 68/399 unit, database 40 files/749, i18n; e2e 414 passed, 1 failed (an S1-E3-05 axe view, passes 28/28 alone; Lane D's isolation work), 23 not run after it; after the final edits the database suite, lint and the epic spec (4/4) pass | nothing; open its PR from the draft |

Do not push to #191 or #192 (it starts CI). Open 3 to 5 as drafts once Actions minutes are back (1 Nov), in that order, base `main`.

## PR drafts
Branch `pr-drafts` (never merges, no PR): `pr-drafts/S1-E4-06a.md`, `S1-E4-04.md`, `S1-E4-QA.md`, the README with the order, and `pr-drafts/plan-s1-e6.md` (the S1-E6 plan; **superseded** by the bundle replan, kept for reference: its section 0 conflicts are resolved, see below).

## Must not lose
- **Migration versions:** Lane A uses `20261024120001` (S1-E4-01a) and `20261025090001` (S1-E4-04; moved from `…100001` because Lane C's renumbered chain uses `20261025100001` to `20261025150001`). New Lane A migrations go **after `20261025150001`**. Check against `main` and every branch before naming one.
- **pgTAP epic-check numbers (CTO, 24 Oct):** 092 S1-E3, **093 S1-E4** (`093-epic-s1-e4.test.sql`), 094 S1-E10, 095 S1-E11, 096 S1-E6, 097 S1-E5.
- **Lane C's rebased chain:** `claude/funny-einstein-pkv35k-chain-rebased-local` (rebased on `main`, not on Lane A's S1-E4 chain). It has the report button, the queue, and the `story`/`chapter` branches in `reportable_item_owner()` and `reportable_item_summary()`. S1-E6-01 and 04 build against it.
- **Lane D owns** the manage-chapters keyboard-drag flake ("Tests: isolate e2e state that leaks between tests").
- **Local tooling:** the worktrees `/home/user/WebApp-04` and `/home/user/WebApp-qa` symlink `node_modules`. `/node_modules` is in `.git/info/exclude` so the symlink isn't committed. In the migration header comments, never write `/*` inside a comment (Postgres nests comments: "/s/*" broke a reset).
- **Decisions applied:** the teaser is 600 words (setting `teaser_length`); signed-out visitors count as under 16 and get only the title of 16+/18+ stories (Q6); the link preview is Q13 option B (below).

## Link-preview picture: two ways back to the real cover (today: option B, a plain square in the cover's colour)
1. **Cloudflare Workers Paid:**
   - What changes: a Pages Function draws the cover with its title on request using satori and resvg (about 1.2 MB, fits) and caches it at the edge.
   - Monthly cost: $5 a month (30 s of CPU a request instead of the free plan's 10 ms; one picture takes 30–50 ms, about 240 ms the first time).
   - Effort: about 1 day, plus static font files (TTF/WOFF) for Bricolage Grotesque and Inter.
2. **Supabase edge function at publish:**
   - What changes: the picture is drawn once, when a chapter is published or the cover changes, in a Supabase edge function (2 s limit). It is stored in a public `link-previews` bucket, and `og:image` points there.
   - Monthly cost: $0 extra on Supabase's free plan, or inside the planned Pro plan ($25 a month).
   - Effort: about 2 days: the function, the bucket and its policies, the publish hook and tests.

## Open questions (for Robert, from the superseded S1-E6 plan)
1. Can read-only accounts (kid_14_waiting, pending_check) like a chapter? My recommendation: no, same gate as every write.
2. The downvote threshold that opens a moderation case (the story gives no number; a proposal would be 5).
3. Confirm that downvotes from accounts under 24 hours old aren't counted (the story's proposal).
4. Who adds the downvote case source and function to Lane C's `cases` (`case_source` has no value for it).
5. May S1-E6-01 queue a `comment_posted` job for notifications (S1-E7-01), as `chapter_published` does?
6. The teaser's "Log in" doesn't return the reader to the chapter after signing in (S1-E2-05 has no "return to" address).
