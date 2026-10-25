# Builder status (March bundles)

Newest state at the top. Read this first on "continue".

## Now (25 Oct 2026, 06:15 UTC)

- **PEOPLE-3** (S1-E15-02, S1-E5-03, S1-E5-QA, S1-E15-QA, plus the `popular` sort and `story_like_total()`): next, from main at 2658253.
- After a container restart, start Docker with `nohup dockerd > /tmp/dockerd.log 2>&1 &` before the quality run.
- Robert allowed merging my own PRs (24 Oct 2026, 22:15), so each bundle merges once its gate passes.
- e2e tip: specs that sign in as a persona and change its language race each other in parallel runs; accessibility loops use a persona no other spec touches (pending_check, failed_check), or a visitor. Specs that need published stories make their own (as `e2e/discover.spec.ts` does) instead of publishing the shared seed stories.

## Merged bundles

| Bundle | PR | Stories |
| --- | --- | --- |
| PEOPLE-1 | #199 (merged 24 Oct 2026) | S1-E5-05, S1-E6-05 |
| SAFE-2 | #200 (merged 24 Oct 2026) | S1-E10-02, S1-E10-08, S1-E11-02 |
| READ-2 | #201 (merged 25 Oct 2026) | S1-E6-03, S1-E6-01, S1-E6-02 |
| READ-3 | #203 (merged 25 Oct 2026) | S1-E6-04, S1-E7-01, S1-E6-QA, S1-E7-QA |
| TOOL-3 | #204 (merged 25 Oct 2026) | demo content part 2b (staging top-up, no story) |
| PEOPLE-2 | #202 (merged 25 Oct 2026) | S1-E5-01, S1-E5-09, S1-E5-02 (popularity sort waits for PEOPLE-3, so #47 stays open) |

## Next

PEOPLE-3 (add the `popular` sort to `browse_stories()` as the default, close #47), SAFE-3, SAFE-4, CMS-1 (now includes S1-E5-08, #53), CHECK.

## Stubbed or carried

- Avatars are initials until SAFE-4 (`picture_uploads` off).
- Privacy notice: name blocks in the next legal version.
- Public report form: needs `public_notice_secret` and `NOTICE_SECRET` set by hand before it saves on staging (by-hand list).
- Notifications: the bell polls every minute; decisions need the statement of reasons and appeal link, and reporters need the outcome (SAFE-3). The story page's like total (`story_like_total()`) is still not shown; add it with the ranking in PEOPLE-3.
- GitHub Actions jobs don't start (billing) until 1 Nov; the local run is the gate.
