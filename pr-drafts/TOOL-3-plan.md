# TOOL-3 plan: demo content part 2b (likes, comments, reactions, follows)

Branch `claude/tool-3-demo-activity` from main at 7f631d2. Not a story: a staging top-up (lanes/01-replan-24-oct.md, TOOL-3).

## What it adds
`supabase/staging-topups/demo-content-2b.sql`, hand-written, one file small enough for the SQL Editor (well under the 450,000-byte part limit), so it serves both psql and the Editor. Run after part 2a.

1. Guards: the 16 seed personas (never production) and part 2a's 36 demo stories (refuses to run before 2a).
2. Who acts: only active adult accounts (adult_writer, teacher, blocker and the five demo writers). No minors, no staff, no sanctioned personas, no new accounts.
3. Follows: writers follow writers, and some stories, never across a block, never themselves.
4. Likes on published demo and classic chapters, never one's own, never across a block. Each story gets a fixed "popularity" from its slug, so shelves and the coming ranking (PEOPLE-3) differ.
5. Comments from a pool of synthetic Romanian and English lines matched to the story's language and category; some writer replies; a few spoilers. Only where comments are on.
6. Emoji reactions on those comments.
7. Daily read totals (chapter_reads, totals only, never who) for the last 30 days, before today.
8. Check query at the end.

Every row has a fixed id or a one-per-pair key, so a second run adds nothing (and so fires no second notification). The notification triggers on reactions and follows fire as normal for new rows.

## Tests
- `scripts/demo-content-2b.test.ts` (Vitest): size under the part limit, one transaction, both guards, ș and ț only, no account inserts, no real-looking emails.
- `scripts/check-demo-content-2b.ts` (`npm run demo:check-2b`, local only): fresh reset, 2a, 2b twice; counts unchanged on the second run; rules hold (no minor or staff actor, no own likes, nothing across a block, comments only where on); resets again.
