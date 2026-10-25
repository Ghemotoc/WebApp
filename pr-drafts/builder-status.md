# Builder status (March bundles)

Newest state at the top. Read this first on "continue".

## Now (25 Oct 2026, 09:00 UTC)

- **Paused** until Thursday 29 Oct 2026, 16:00, at Robert's request (his limits reset then). Main is at 2aff571.
- **First on Thursday**, before SAFE-3 (see team memory `builder-pause-oct-2026`):
  1. S1-E11-16 (#114): the staff "Add a classic work" form (writer's name from `classic_authors`, source and credit, then chapters).
  2. The joining-anniversary greeting (a small greeting line, "Happy <product> anniversary, <name>" in the month they joined).
  3. The optional birthday (day and month only, never the year; staff correct it on request; the year of birth is never changed), with a privacy-notice line flagged for the lawyer.
- After a container restart, start Docker with `nohup dockerd > /tmp/dockerd.log 2>&1 &` before the quality run.
- Robert allowed merging my own PRs (24 Oct 2026, 22:15), so each bundle merges once its gate passes.
- e2e tip: specs that sign in as a persona and change its language race each other in parallel runs; accessibility loops use a persona no other spec touches (pending_check, failed_check), or a visitor. Specs that need published stories make their own (as `e2e/discover.spec.ts` does) instead of publishing the shared seed stories. Sign-up specs now fill the Username field.

## Merged bundles

| Bundle | PR | Stories |
| --- | --- | --- |
| PEOPLE-1 | #199 (merged 24 Oct 2026) | S1-E5-05, S1-E6-05 |
| SAFE-2 | #200 (merged 24 Oct 2026) | S1-E10-02, S1-E10-08, S1-E11-02 |
| READ-2 | #201 (merged 25 Oct 2026) | S1-E6-03, S1-E6-01, S1-E6-02 |
| READ-3 | #203 (merged 25 Oct 2026) | S1-E6-04, S1-E7-01, S1-E6-QA, S1-E7-QA |
| TOOL-3 | #204 (merged 25 Oct 2026) | demo content part 2b (staging top-up, no story) |
| PEOPLE-2 | #202 (merged 25 Oct 2026) | S1-E5-01, S1-E5-09, S1-E5-02 |
| PEOPLE-3 | #205 (merged 25 Oct 2026) | S1-E15-02, S1-E5-03 (with the popular sort), S1-E15-QA, S1-E5-QA part one; plus Robert's additions: the username on the sign-up form, the email in Settings, classics by their real authors (part of S1-E5-06) |

## Next

Thursday's three items above, then SAFE-3, SAFE-4, CMS-1 (now includes S1-E5-08, #53, and S1-E5-QA part two), CHECK.

## Stubbed or carried

- Avatars are initials until SAFE-4 (`picture_uploads` off).
- Privacy notice: name blocks in the next legal version.
- Public report form: needs `public_notice_secret` and `NOTICE_SECRET` set by hand before it saves on staging (by-hand list).
- Notifications: the bell polls every minute; decisions need the statement of reasons and appeal link, and reporters need the outcome (SAFE-3). The story page now shows likes and comments (PEOPLE-3).
- GitHub Actions jobs don't start (billing) until 1 Nov; the local run is the gate.
