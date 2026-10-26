# Builder status (March bundles)

Newest state at the top. Read this first on "continue".

## Now (26 Oct 2026, 10:40 UTC)

- Robert asked (26 Oct, 05:53) for PEOPLE-4 then SAFE-3, and to stop before SAFE-4.
- PEOPLE-4 merged as #207, SAFE-3 merged as #208 (main 1a57988). **Stopped before SAFE-4**, as Robert asked: wait for him.
- Use Node 24 (`source scratchpad/env.sh`): the shell's default Node 22 fails `formatStatNumber` ("19K").
- After a container restart, start Docker with `nohup dockerd > /tmp/dockerd.log 2>&1 &` before the quality run.
- Robert allowed merging my own PRs (24 Oct 2026, 22:15), so each bundle merges once its gate passes.
- e2e tip: specs that sign in as a persona and change its language race each other in parallel runs; accessibility loops use a persona no other spec touches (pending_check, failed_check), or a visitor. Specs that need published stories make their own (as `e2e/discover.spec.ts` does) instead of publishing the shared seed stories. Sign-up specs now fill the Username field.
- Known on main: the reader's 2-second cold-load test runs about 2.3 s on this machine; it fails on main too.

## Merged bundles

| Bundle | PR | Stories |
| --- | --- | --- |
| PEOPLE-1 | #199 (merged 24 Oct 2026) | S1-E5-05, S1-E6-05 |
| SAFE-2 | #200 (merged 24 Oct 2026) | S1-E10-02, S1-E10-08, S1-E11-02 |
| READ-2 | #201 (merged 25 Oct 2026) | S1-E6-03, S1-E6-01, S1-E6-02 |
| READ-3 | #203 (merged 25 Oct 2026) | S1-E6-04, S1-E7-01, S1-E6-QA, S1-E7-QA |
| TOOL-3 | #204 (merged 25 Oct 2026) | demo content part 2b (staging top-up, no story) |
| PEOPLE-2 | #202 (merged 25 Oct 2026) | S1-E5-01, S1-E5-09, S1-E5-02 |
| SAFE-3 | #208 (merged 26 Oct 2026) | S1-E10-04, S1-E10-09, S1-E10-10 |
| PEOPLE-4 | #207 (merged 26 Oct 2026) | S1-E2-05 follow-up (email change by codes), S1-E2-12, S1-E2-13, S1-E11-16a, S1-E1-04 fix |
| PEOPLE-3 | #205 (merged 25 Oct 2026) | S1-E15-02, S1-E5-03 (with the popular sort), S1-E15-QA, S1-E5-QA part one; plus Robert's additions: the username on the sign-up form, the email in Settings, classics by their real authors (part of S1-E5-06) |

## Next

SAFE-4 (only when Robert asks), CMS-1 (now includes S1-E5-08, #53, S1-E5-QA part two and S1-E11-19: every email, Auth emails included, sent through a Send Email hook and Brevo with admin-editable text), CHECK.

## Stubbed or carried

- Avatars are initials until SAFE-4 (`picture_uploads` off).
- Privacy notice: name blocks in the next legal version.
- Public report form: needs `public_notice_secret` and `NOTICE_SECRET` set by hand before it saves on staging (by-hand list).
- Notifications: the bell polls every minute; decisions link to their statement of reasons and reporters get the outcome (SAFE-3); appeals go through Contact us until S1-E10-07. The story page now shows likes and comments (PEOPLE-3).
- GitHub Actions jobs don't start (billing) until 1 Nov; the local run is the gate.
