# Staging top-ups

Small SQL files that bring an existing staging database up to date with a story's changes to `supabase/seed.sql` (decided 18 Oct 2026).

Why: staging already holds the seed personas, so re-loading `seed.sql` there fails on duplicate keys. A fresh database (local, CI, or staging after a full reset) needs no top-ups: `seed.sql` already has everything.

Rules for each file:

- Name: `<story-id>.sql`, for example `S1-E3-01.sql`, written by the story that changed the seed.
- It adds or updates only what that story changed. It never creates accounts and never touches real data.
- It is safe to run twice (`on conflict do nothing`, or `update … where` the value is still missing).
- It starts with a header comment: the story, what it adds, and how to check it worked.
- The pull request lists it under **By hand**. Running it: `docs/runbooks/staging-reset-and-seed.md`, "Top-ups".

No story has needed one yet in the repository: the S1-E2 top-up (consents, the four test invites, the persona usernames and pen name) was given to Robert directly on 18 Oct 2026.
