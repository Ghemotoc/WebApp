# Builder status (March bundles)

Newest state at the top. Read this first on "continue".

## Now (31 Oct 2026, after WRITE-2, bundle 5 done)

- **Robert's new plan (30 Oct 2026, 05:22): build the full Stage 1 app, all 17 bundles in `full-app-bundles.md`, one at a time, without waiting for him.** It replaces the March-only order and the "Not March" list. Everything else in the builder brief still applies.
- Outside services: adapter with a `stub` and a `real` provider, misleading features behind a flag that is off, the missing key or account added to GO-LIVE in `by-hand-for-robert.md`. Never stop for them.
- Before each bundle: check main, skip what is built, finish what is partly built.
- If the usage limit hits: stop cleanly, carry on at "continue".
- Now: bundles 2 (CMS-1, #210 to #215) and 3 (DISCOVER-2: 3a search #216, 3b classics shelf and S1-E11-16b #217) are done. Bundle 4 READ-4: 4a library (S1-E4-03, #218), 4b reading settings (S1-E4-02, #219) 4c share and quote card (S1-E4-05, S1-E4-07, #220) 4d writer dashboard (S1-E3-07, #221) 4e email notifications and digests (S1-E7-02, #222) and 4f cookieless analytics and the event catalogue (S1-E15-01, S1-E15-03, #223) and 4g metrics and the compliance log (S1-E11-04, #224) merged; bundle 4 is done after its full run (1,198 e2e passed; the 2 failures were the known reader timing and a legal.spec race, noted below). Bundle 5 WRITE-2 (S1-E3-09, S1-E3-10, S1-E3-11, S1-E3-12, S1-E4-11, S1-E6-06): 5a pictures in chapters (#225) and 5b music and video (#226; ADR 0008; also fixed ChapterText rebuilding its pictures and cards on every render) merged; 5c drawings (#227) merged; 5d Canva covers (#228; ADR 0009, Canva stand-in; also fixed the local functions server sending bytes as text) merged; 5e share a passage or picture (#229; spot links /p3-5, picture cards, passage previews) merged; 5f paragraph comments (S1-E6-06, #231) merged after the bundle 5 full e2e run (1,184 tests; only the known reader timing failed). Bundle 5 is done. Bundle 5b ATLAS (S1-E17, parts a to i): 5b-a story plans and the at-a-glance page (#232) and 5b-b characters (#233; S1-E17-12 waits for parts e and h) and 5b-c relationships, map and family tree (#234) and 5b-d the bible (#235; Playwright's dragTo doesn't fire HTML5 drops here, so the spec dispatches drag events with one DataTransfer) merged; 5b-e chapter planning and the writing view (#236) and 5b-f storyline board, timeline and POV lanes (#237) and 5b-g questions and ideas, marketing notes (#238; S1-E17-28 [[name]] links wait for part h) merged; 5b-h search and [[name]] cross-links, "Mentioned in" (#239) merged; 5b-i public parts S1-E17-32 to 35 and the epic check (#240) merged after the bundle's full e2e run (3 parallel shards sharing one database gave 54 race failures; every affected file passed alone after a db reset, except the known reader timing, which fails on main too). Bundle 5b is done. Bundle 6 ACCOUNTS-2: 6a Yoti age check on the web against a stand-in (#241; ADR 0010; also let third-party:check pass the Atlas help text's example.com) merged; 6b manual age checks, the 18 invitation and the 14-day clean-up (#242; the clean-up erases personal data, row deletion waits for S1-E13-05) merged; 6c parental consent (#243; ADR 0011; the parent's link token sits after "#"; also fixed user-management.spec for the moderator's new Manual age checks tab) merged; 6d onboarding and the "Picked for you" shelf (#244; also fixed sign-up.spec's Continue link, now that new accounts see the setup notice) merged; 6e Google, Apple, Microsoft and passkeys behind social_login and passkey_login (#245; passkey e2e uses Chrome's virtual authenticator at http://localhost:4173) merged; 6f teacher badge (S1-E2-11, #246) merged after the bundle's full e2e run (1,358 tests; 43 parallel-race failures all passed alone after a db reset except the known reader timing; also fixed staff-compliance-log for appealed age checks, birthday.spec's padded day on the 1st to 9th, and the staff menu lists). Bundle 6 is done. Bundle 7 MESSAGES: 7a who may message whom (S1-E9-03, #247; can_message() and the profile's neutral note) merged. Next: 7b private messages (S1-E9-01). For full runs, start one preview server first (scratchpad e2e-par.sh), and run `npx supabase db reset` before re-running failures. Robert added bundle 8b IDEAS-1 (all 13 ideas of 31 Oct) after PRIVACY. The readable bundle list for Robert is /mnt/project-files/builder/bundles.md: update it after each merge. e2e-split.sh: the 3 shards' web servers can race for port 4173; if shards 1 or 2 die at start, run them one after the other. The full e2e run uses scratchpad `e2e-split.sh` (3 shards, then `legal.spec.ts` alone, which fixes the bundle 4 race). Follow-ups: a GIN index for search when the catalogue grows (3a); rank badges on story cards need a cached rank table (2g). The full quality run can pass the 1-hour background limit: run e2e in a separate background call if it is killed. Checklist uses lettered parts per bundle (Robert, 30 Oct 11:42).
- Use Node 24 and the pre-installed Chromium (`source scratchpad/env.sh`, which sets PLAYWRIGHT_CHROMIUM_PATH; without it Playwright looks for a browser that isn't there): the shell's default Node 22 fails `formatStatNumber` ("19K").
- After a container restart, start Docker with `nohup dockerd > /tmp/dockerd.log 2>&1 &` before the quality run.
- Robert (30 Oct 22:10): fast checks per lettered part, full e2e (quality.sh) once before the bundle's last part merges. 22:17: no message to Robert on merges; the daily 9:00 CET ideas document (scheduled task trig_01UMV8y7xARfgpioUZKXYEhC; list in `feature-ideas.md`) is the only regular message.
- Robert allowed merging my own PRs (24 Oct 2026, 22:15), so each bundle merges once its gate passes.
- e2e tip: specs that sign in as a persona and change its language race each other in parallel runs; accessibility loops use a persona no other spec touches (pending_check, failed_check), or a visitor. Specs that need published stories make their own instead of publishing the shared seed stories. A second report by the same person on the same item within a day returns the first, so specs that report twice use different reporters.
- Known on main: the reader's 2-second cold-load test runs about 2.3 to 2.4 s on this machine. The reader's 40 KB script budget is tight: lazy-load anything only some readers open (READ-4b did this for the settings panel; READ-4c loads the Share button when near via `src/lib/use-is-near.ts`, the quote bar on the first selection, and translations through a register function; keep shared query keys in tiny files such as `library/libraryQueryKey.ts`).
- Before e2e runs, check nothing is still serving on port 4173 (`ps aux | grep 'vite preview'`): Playwright reuses an old preview server and tests a stale build.

## Robert's added task (30 Oct 2026, 10:43): tags with staff approval

Built as part (e) of CMS-1, after (d). Robert: "There should be always some option to add tags. The tags are separated by comma. Please add some recommended tags in advance. Users can add additional tags, however, they need to be approved by a member of staff."

Rank badges and tag languages (Robert, 30 Oct 10:44 and 10:48): a cover shows the story's top 3 ranks in its tags ("#4 in Fantasy"), using the Discover ranking formula; the writer may pick a different 3; ranks are counted only among stories the reader may see (per age band). A tag is one idea with a name per language (Fantasy, Fantezie, Fantaisie), shown in the interface language; typing another language's name is recognised and swapped to the interface language. Staff name new tags in each open language when approving.
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
| READ-4e | #222 (merged 31 Oct 2026) | S1-E7-02 |
| READ-4d | #221 (merged 31 Oct 2026) | S1-E3-07 |
| READ-4c | #220 (merged 31 Oct 2026) | S1-E4-05, S1-E4-07 |
| READ-4b | #219 (merged 30 Oct 2026) | S1-E4-02 |
| READ-4a | #218 (merged 30 Oct 2026) | S1-E4-03 |
| CMS-1a | #210 (merged 30 Oct 2026) | S1-E11-03, S1-E11-05 |
| CMS-1b | #211 (merged 30 Oct 2026) | S1-E11-06, S1-E11-10, S1-E11-12, S1-E5-08 |
| CMS-1c | #212 (merged 30 Oct 2026) | S1-E11-18, S1-E11-19 |
| CMS-1d | #213 (merged 30 Oct 2026) | S1-E11-11, S1-E5-07, S1-E5-QA part two, S1-E11-QA |
| CMS-1e/f | #214 (merged 30 Oct 2026) | tags with staff approval and names per language (Robert's task) |
| CMS-1g | #215 (merged 30 Oct 2026) | rank badges on covers (Robert's task) |
| DISCOVER-2a | #216 (merged 30 Oct 2026) | S1-E5-04 |
| DISCOVER-2b | #217 (merged 30 Oct 2026) | S1-E5-06, S1-E11-16b |
| PEOPLE-3 | #205 (merged 25 Oct 2026) | S1-E15-02, S1-E5-03 (with the popular sort), S1-E15-QA, S1-E5-QA part one; plus Robert's additions: the username on the sign-up form, the email in Settings, classics by their real authors (part of S1-E5-06) |

## Next

APPS-1 and APPS-2 are skipped for now (Robert, 30 Oct 2026, 11:41: "I will need a proper engineer for them"); CHECK runs straight after SPONSORS.

The rest of the 17 bundles of `full-app-bundles.md`, in order: CMS-1, DISCOVER-2, READ-4, WRITE-2, ACCOUNTS-2, MESSAGES, PRIVACY, FORUMS-1, FORUMS-2, CLASSES, ADMIN-2, CONTESTS, SPONSORS, APPS-1, APPS-2, CHECK; then GO-LIVE with Robert.

## Stubbed or carried

- Picture uploads (covers, avatars) are built but stay off (`picture_uploads`) until the Sightengine and Arachnid Shield accounts exist (GO-LIVE).
- Privacy notice: name blocks in the next legal version.
- Public report form: needs `public_notice_secret` and `NOTICE_SECRET` set by hand before it saves on staging (by-hand list).
- Notifications: the bell polls every minute; decisions link to their statement of reasons and reporters get the outcome (SAFE-3); appeals and moderator mail are live (SAFE-4). The story page now shows likes and comments (PEOPLE-3).
- GitHub Actions jobs don't start (billing) until 1 Nov; the local run is the gate.
