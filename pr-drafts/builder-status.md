# Builder status (March bundles)

Newest state at the top. Read this first on "continue".

## Now (25 Oct 2026, 01:45 UTC)

- **PEOPLE-2** (S1-E5-01, S1-E5-09, S1-E5-02, S1-E5-08): next, starting from main at aaa20b5.
- Robert allowed merging my own PRs (24 Oct 2026, 22:15), so each bundle merges once its gate passes.
- e2e tip: specs that sign in as a persona and change its language race each other in parallel runs; accessibility loops use a persona no other spec touches (pending_check, failed_check for comments).

## Merged bundles

| Bundle | PR | Stories |
| --- | --- | --- |
| PEOPLE-1 | #199 (merged 24 Oct 2026) | S1-E5-05, S1-E6-05 |
| SAFE-2 | #200 (merged 24 Oct 2026) | S1-E10-02, S1-E10-08, S1-E11-02 |
| READ-2 | #201 (merged 25 Oct 2026) | S1-E6-03, S1-E6-01, S1-E6-02 |

## Next

PEOPLE-2, READ-3, TOOL-3, PEOPLE-3, SAFE-3, SAFE-4, CMS-1, CHECK.

## Stubbed or carried

- Avatars are initials until SAFE-4 (`picture_uploads` off).
- Privacy notice: name blocks in the next legal version.
- Public report form: needs `public_notice_secret` and `NOTICE_SECRET` set by hand before it saves on staging (by-hand list).
- Comments: a `comment_posted` job is queued for S1-E7-01 (READ-3); the story page's like total (`story_like_total()`) waits for S1-E5-01 (PEOPLE-2).
- GitHub Actions jobs don't start (billing) until 1 Nov; the local run is the gate.
