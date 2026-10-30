# Builder status (March bundles)

Newest state at the top. Read this first on "continue".

## Now (30 Oct 2026, after CMS-1a)

- **Robert's new plan (30 Oct 2026, 05:22): build the full Stage 1 app, all 17 bundles in `full-app-bundles.md`, one at a time, without waiting for him.** It replaces the March-only order and the "Not March" list. Everything else in the builder brief still applies.
- Outside services: adapter with a `stub` and a `real` provider, misleading features behind a flag that is off, the missing key or account added to GO-LIVE in `by-hand-for-robert.md`. Never stop for them.
- Before each bundle: check main, skip what is built, finish what is partly built.
- If the usage limit hits: stop cleanly, carry on at "continue".
- Now: bundle 2, CMS-1, split in four (see `CMS-1b-plan.md`): a merged as #210; b (website CMS, notices, help, home page) in `/home/claude/wt-cms1b`, DB test 172 passes, lint and types clean, e2e next; then c (interface text, email templates) and d (seasonal doodles, S1-E5-QA part two).
- Use Node 24 (`source scratchpad/env.sh`): the shell's default Node 22 fails `formatStatNumber` ("19K").
- After a container restart, start Docker with `nohup dockerd > /tmp/dockerd.log 2>&1 &` before the quality run.
- Robert allowed merging my own PRs (24 Oct 2026, 22:15), so each bundle merges once its gate passes.
- e2e tip: specs that sign in as a persona and change its language race each other in parallel runs; accessibility loops use a persona no other spec touches (pending_check, failed_check), or a visitor. Specs that need published stories make their own instead of publishing the shared seed stories. A second report by the same person on the same item within a day returns the first, so specs that report twice use different reporters.
- Known on main: the reader's 2-second cold-load test runs about 2.3 s on this machine.

## Robert's added task (30 Oct 2026, 10:43): tags with staff approval

Built as part (e) of CMS-1, after (d). Robert: "There should be always some option to add tags. The tags are separated by comma. Please add some recommended tags in advance. Users can add additional tags, however, they need to be approved by a member of staff."
- The comma tag box already exists on New story and Story settings (S1-E3-01, `TagInput`); keep it everywhere a story's tags are edited.
- Seed recommended tags (about 40, ro and en names) and show them as tappable suggestions under the box.
- A tag that isn't approved yet stays on the writer's story but is hidden from readers, Discover and search until staff approve it; the writer sees "waiting for approval".
- Staff approve, rename or reject new tags from a queue (owner, admin, moderator); every decision is in the audit log. A rejected tag drops off the stories that used it and the writer is told.

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
| SAFE-4 | #209 (merged 30 Oct 2026) | S1-E10-05, S1-E10-07, S1-E10-11, S1-E10-03b, S1-E10-12, S1-E10-13b, S1-E14-03, S1-E10-QA round two, S1-E14-QA |
| CMS-1a | #210 (merged 30 Oct 2026) | S1-E11-03, S1-E11-05 |
| PEOPLE-3 | #205 (merged 25 Oct 2026) | S1-E15-02, S1-E5-03 (with the popular sort), S1-E15-QA, S1-E5-QA part one; plus Robert's additions: the username on the sign-up form, the email in Settings, classics by their real authors (part of S1-E5-06) |

## Next

The rest of the 17 bundles of `full-app-bundles.md`, in order: CMS-1, DISCOVER-2, READ-4, WRITE-2, ACCOUNTS-2, MESSAGES, PRIVACY, FORUMS-1, FORUMS-2, CLASSES, ADMIN-2, CONTESTS, SPONSORS, APPS-1, APPS-2, CHECK; then GO-LIVE with Robert.

## Stubbed or carried

- Picture uploads (covers, avatars) are built but stay off (`picture_uploads`) until the Sightengine and Arachnid Shield accounts exist (GO-LIVE).
- Privacy notice: name blocks in the next legal version.
- Public report form: needs `public_notice_secret` and `NOTICE_SECRET` set by hand before it saves on staging (by-hand list).
- Notifications: the bell polls every minute; decisions link to their statement of reasons and reporters get the outcome (SAFE-3); appeals and moderator mail are live (SAFE-4). The story page now shows likes and comments (PEOPLE-3).
- GitHub Actions jobs don't start (billing) until 1 Nov; the local run is the gate.
