<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Closes #135
Closes #48
Closes #137
Part of #55 (the journey from the public home page waits for S1-E5-08 in CMS-1)
Part of #51 (classics show their real author; the Classics shelf itself is after March)
Follows on #12 and #13 (Robert's additions of 25 Oct 2026: the username on the sign-up form, and the email in Settings)

Bundle PEOPLE-3: the March test numbers (S1-E15-02), popularity ranking (S1-E5-03, with S1-E5-02's popular sort as the default) and the epic checks for S1-E15 and, in part, S1-E5. Robert added three changes on 25 Oct 2026, which are in this pull request too: the username chosen on the sign-up form (S1-E2-04), seeing and changing one's own email in Settings (S1-E2-05) and classics showing their real author (S1-E5-06).

## What changed

### S1-E15-02: the March test numbers

- **`daily_metrics`** (migration `20261028100001`): one total per day, metric and market. The metrics are writers who published, signed-up readers, chapter reads and the return rate. Market is `all`, an open market's country code or `other`.
  - There is no user ID column, so no row can be about a person.
  - Kept 3 years (`daily_metrics_keep_years`).
- **The nightly job** `count-daily-metrics` (04:07 UTC) runs `run_daily_metrics()`, which counts yesterday by the Romanian date.
  - Counting a day again replaces it.
  - Each run deletes rows older than 3 years.
  - The migration counts the last 30 days once, so the page isn't empty on day one.
- **The return rate** comes from daily totals only. It is reads of chapter N+1 in its first 7 days, divided by reads of chapter N before N+1 came out, for chapters released in the last 36 to 6 days. The page labels it "Approximation".
- **Targets are settings:** `march_target_writers` (20), `march_target_readers` (200) and `march_target_return_rate` (30).
- **`admin_march_numbers(days)`** answers the owner and admins only (`may_see_march_numbers()`), with totals only. Anyone else gets `42501`.
- **The staff Metrics page** `/staff/metrics` follows board AdminMetrics, screen 8.7:
  - three cards with progress bars against the targets
  - writers who published, by country
  - chapter reads per day
  - "Counted on" with the date

  A moderator holds the metrics area for queue numbers only, so they see a line pointing to the moderation queue. Metrics joins the staff menu before Audit log.

### S1-E5-03: popularity ranking

- **`story_scores`** (migration `20261028110001`) holds one score per story. The hourly job `compute-story-scores` (13 minutes past) runs `compute_story_scores()`.
  - **Signals:** reads, likes, comments and read-through, from the last 60 days.
  - **Time decay:** each signal is halved every 7 days.
  - **Weights** are the settings `ranking_weight_reads` 1, `_likes` 5, `_comments` 8, `_shares` 10 and `_read_through` 0.5. The next run uses a changed weight with no code change.
  - **Never counted:** the writer's own likes and comments, and private downvotes.
  - **Shares** count 0 until sharing exists (S1-E4-05, `docs/mocks.md`).
  - Staff may read the scores. Readers only see the order.
- **Two new lists:**
  - **Popular** (`/discover/all/popular`)
  - **New and rising** (`/discover/all/rising`): writers whose first story came out within `rising_writer_days` (90)
- **Popular is the default sort** on every list except New stories (newest first), Recently updated and the follows shelf (last chapter). The front end's `listDefaultSort()` mirrors the database's `list_default_sort()`. "Popular" is now first in the Sort by drop-down. Ties go to the newer story.
- **Discover's shelves** follow the public setting `discover_shelves`:
  - following
  - popular
  - rising
  - new
  - completed
  - updated
  - one shelf per category

  Staff can reorder or drop shelves with no release (Q46).
- **"How ranking works"**, under Discover's intro, opens `/legal/terms#section-5`. That is the terms' "How we rank and recommend", which already lists these signals. Legal section cards now have `id="section-<number>"` and scroll into view when the address names them.
- **The story page's stats row** (board 3.4, "Story numbers") shows:
  - likes
  - comments
  - published chapters
  - "Updated <date>"

  It uses doodle-set icons: `heart.svg` and `clock.svg` are new, copied from `design/assets/`. Read totals stay the writer's own. `get_story_page()` returns `stats {likes, comments}`.

### Added on 25 Oct 2026 at Robert's request

**The username on the sign-up form (S1-E2-04).** Robert: the username should be chosen "at the same time you put a password in", so the account button's "?" never shows.
- The form has a Username field after the email, with the same live "is it free?" line as setup. `check_handle()` is now open to visitors (it answers only ok or a refusal reason, never who has a name).
- The form checks the name again just before sending. The sign-up trigger checks it a third time with `sign_up_handle()` (migration `20261028120001`) and refuses the whole sign-up when the name is taken, a look-alike, too short, reserved or staff-like, so nothing is kept.
- After confirming the email, "Continue" goes to the home page. `/setup` stays for accounts made before today without a username. The pen name is added in Settings.

**The email address in Settings (S1-E2-05).** Robert: every user, minors included, can see their own email and change it whenever they want; only the owner sees it.
- A new Email address panel shows the account's own address with "Only you can see it". The address is read from Supabase Auth (`getUser()`), never stored in our tables, and never shown on the profile.
- "Change email" asks Supabase to change it. Because `double_confirm_changes` is on, a link goes to both the old and the new address (new template `supabase/templates/email_change.html`, in Romanian and English). The first link says "One more link to open" and the second one makes the change. A stolen session alone can't move the account to someone else's inbox.
- Asking for the same address, an address another account uses, a malformed address and too many tries each get their own plain message.

**Classics show their real author (S1-E5-06).** Robert: classics stay classics, but the writer shown should be the real one.
- New table `classic_authors` (name and year of death; readable by everyone, writable by nobody until the staff form) and `stories.classic_author_id` (migration `20261028130001`).
- `story_writer_name()` puts the real author on every byline: the cards, the story page, the reader and the link preview. The story page shows an author card ("A classic in the public domain. Its author died in 1889.") instead of the writer card, with no Follow and no profile link.
- The author is stored on the work, not as an account, because a story's owner never changes (architecture 1.6) and nobody should be able to follow, message or sign in as Eminescu. The classics stay owned by the official classics account.
- The demo build writes each classic's author into part 2a and, on its own, into `supabase/staging-topups/classic-authors.sql` (11 authors, 20 classics).
- Robert's "Add a classic work" form for staff comes with S1-E11-16 (#114), first thing on Thursday.

### Epic checks

- **S1-E15-QA:**
  - `e2e/epic-s1-e15.spec.ts`: reading → the job → the owner's page; who may see it; axe
  - `supabase/tests/database/099-epic-s1-e15.test.sql`
  - `docs/epic-reports/S1-E15.md`
- **S1-E5-QA, part one:**
  - `e2e/epic-s1-e5.spec.ts`: browse journey; a like lifts a story; ratings; blocks; axe
  - `supabase/tests/database/098-epic-s1-e5.test.sql`
  - `docs/epic-reports/S1-E5.md`

  The home page journey is added in CMS-1.

## Acceptance criteria

### S1-E15-02

| Criterion | Test |
| --- | --- |
| The daily job reports writers with a published chapter (in total and by open market), signed-up readers and the return rate | `156` (job, by market, readers without staff); `099`; `e2e/staff-metrics.spec.ts` |
| The return rate comes from daily totals only and is labelled "approximation" | `156` (40 over 100 is 40.0); `e2e/staff-metrics.spec.ts` (the Approximation pill) |
| Every metric is aggregated: no per-reader record, no individual export | `156` (no user ID in the answer); `099` (no person column on `chapter_reads` or `daily_metrics`); `e2e/epic-s1-e15.spec.ts` |
| Metrics are deleted after 3 years | `156` |
| Policy `daily_metrics_select_march_numbers`: allowed for owner and admin, denied for moderator and member | `156` |

### S1-E5-03

| Criterion | Test |
| --- | --- |
| The hourly job scores reads, likes, comments, shares and read-through with time decay | `155` (likes and comments lift; older likes count less); `098` (reads and a like); shares are 0 until S1-E4-05 |
| A changed weight is used by the next run with no code change | `155` (weights 0, then back) |
| Private downvotes are never used | `155` |
| "How ranking works" lists the signals in plain words | `e2e/ranking.spec.ts` (opens the terms at section 5) |
| Discover mixes shelves, and their order can change without a release; no shelf uses a person's reading history | `e2e/ranking.spec.ts` (setting reorders and drops shelves); `browse_stories()` has no per-reader input |
| S1-E5-02, popular is the default and ties go to the newer story | `155`, `152`; `e2e/ranking.spec.ts`, `e2e/epic-s1-e5.spec.ts` |
| Policy `story_scores_select_staff`: allowed for admin, denied for a member; nobody writes it | `155` |

### Epic checks

| Criterion | S1-E15-QA | S1-E5-QA (part one) |
| --- | --- | --- |
| Journeys with adult_writer, teen_17, kid_14_ok, kid_14_waiting (and staff) | `epic-s1-e15.spec.ts`, `099` | `epic-s1-e5.spec.ts`, `098` |
| Breaks where stories meet fixed or ticketed | report: none | report: two, both fixed |
| axe at 390, 768 and 1440 px | journey 3 plus `staff-metrics.spec.ts` | journey 5 plus `discover.spec.ts`, `writer-profile.spec.ts` |
| Every policy has an allowed and a denied test | `check-policy-tests` passes | `check-policy-tests` passes |
| Code tour covers the epic | "Epic S1-E15 at a glance" | "Epic S1-E5 at a glance" |
| Epic report | `docs/epic-reports/S1-E15.md` | `docs/epic-reports/S1-E5.md` |

### Today's additions

| Criterion | Test |
| --- | --- |
| The username is chosen on the sign-up form and saved with the account | `157` (free name saved with its slug); `SignUpPage.test.tsx`; `e2e/sign-up.spec.ts` (active at once, no "Choose a username") |
| A taken, look-alike, too short or reserved name refuses the whole sign-up and keeps nothing | `157`; `SignUpPage.test.tsx` (taken: nothing sent) |
| Every account sees its own email in Settings, and only there | `e2e/email-change.spec.ts` (Settings shows it; the profile doesn't) |
| Anyone can change it; the change needs both links | `e2e/email-change.spec.ts` (Mailpit: first link "one more", second link changes it, log in with the new one); `emailAddress.test.ts` |
| A classic names its real author on cards, the story page, the reader and the link preview | `158`; `e2e/classic-authors.spec.ts` |
| Policy `classic_authors_select_everyone`: allowed for a visitor and a member, denied for any write | `158` |

## Definition of Done

- **Code:** strict TypeScript with no `any`, ESLint limits and Prettier pass. Every file has a header comment, and every function and policy a doc comment. The cover mapping in `fetchStoryPage()` was split out to stay under the complexity limit.
- **Types:** regenerated (`types:check` passes). No hand-written database type.
- **Tests:** every criterion has a test (tables above). Every new policy has an allowed and a denied pgTAP test.
- **Accessibility:**
  - axe passes at 390, 768 and 1440 px, light and night, Romanian and English, on Metrics, Discover, the category page and the profile.
  - The progress bars are real `progressbar`s with labels.
  - The ranking link is underlined (axe `link-in-text-block`).
- **Design rules:** staff screens have no doodles. The stats icons are SVG doodle-set files, hidden from screen readers. Label and value lists have row lines.
- **Privacy:** no new personal data. `daily_metrics` and `story_scores` are totals, and both are in `docs/retention.md`. No user ID on any public view or answer.
- **Security:** staff checks are in the database (`staff_may()`), and every table has RLS and explicit grants.
- **i18n:** every string is in ro and en, with ș and ț (`i18n:check`).
- **Docs:**
  - code tour (two sections and two epic sections)
  - `docs/runbooks/scheduled-jobs.md` (both jobs)
  - `docs/retention.md`
  - `docs/mocks.md` (shares)
  - `docs/board-fixes.md` (four rows)
  - the feature READMEs
  - two epic reports

## Local check run

Clean start on `7c03e04` (`npm ci`, `supabase stop --no-backup` and `start`, `npm run build`, `npm run checks`, `npx wrangler pages functions build`):

| Check | Result |
| --- | --- |
| `npm run lint` (ESLint and Prettier) | pass |
| `npm run typecheck` | pass |
| `npm run types:check` | pass |
| `npm test` (Vitest) | 93 files, 589 tests pass |
| `npx supabase db reset` then `npx supabase test db` (pgTAP) | 68 files, 1431 tests pass |
| `npm run test:e2e` (Playwright with axe) | 734 pass; one test in `user-management.spec.ts` stopped when the machine briefly ran out of disk space (`ENOSPC`, so its 27 serial follow-ons didn't run). That file was then run again on its own: 28 pass |
| `npm run i18n:check` | pass |
| `npm run migrations:check` | pass |
| Functions build (`wrangler pages functions build`) | compiles |

The first clean run, on `17c0c74`, stopped at `npm test`: the sign-up rules test didn't know about the new username field. Fixed in `7c03e04` and run again from a clean start.

## Screenshots

Taken at 390, 768 and 1440 px (not attached: the session can't upload images):
- `/settings` as adult_writer: the new Email address panel sits between "About you" and "Blocked accounts". At 390 px the address, the field and the button stack, and nothing is cut off or scrolls sideways.
- `/s/luceafarul-classic` with the demo content: "by Mihai Eminescu" under the title, his name on the drawn cover, and "The author · Mihai Eminescu · A classic in the public domain. Its author died in 1889." in place of the writer card, with no Follow or See profile.
- `/staff/metrics` as owner: the three target cards, by country and per day.

## Decisions taken

- **"Signed-up readers"** means confirmed, live accounts that aren't staff. "Opened a chapter" would need a record per reader, which we never keep (17 Oct 2026, 12:34). This is in `docs/board-fixes.md`.
- **Reads per day is a list, not the board's chart,** so every number is real text a screen reader reads. A chart can come later.
- **Moderators** hold the metrics area (architecture 1.8.3: "queue numbers"), so Metrics shows in their menu. The page tells them the March numbers are for the owner and admins, and links to the queue.
- **The return rate isn't capped at 100%.** The demo content makes it read over 100% because its reads are made up. Real reading can't do that, and capping would hide a counting fault.
- **The return rate window:** chapters N+1 released 36 to 6 days before the counted day, so each has had its full 7 days.
- **Default weights** (OPEN in the story): reads 1, likes 5, comments 8, shares 10, read-through 0.5, half-life 7 days, 60-day window. They are settings, to be tuned with real data.
- **"New and rising"** means writers whose first story came out within 90 days (`rising_writer_days`). This is the story's Q13 proposal.
- **Popular is the default on every list** except New stories, Recently updated and the follows shelf, whose names say their order.
- **Discover's shelf order** puts follows, Popular and New and rising first, then New, Completed, Recently updated and the categories. It is a setting, so it can change without a release.
- **"How ranking works"** links to the terms' section 5 rather than a new page, because that section already lists the signals in plain words. One explanation means one text to keep right.
- **The story page stats row** leaves out the board's read total: read totals are the writer's own (S1-E3-07). Numbers over 1,000 are shortened the reader's way ("1.2K").
- **The menu** puts Metrics just before Audit log, as in architecture 1.8.2.
- **Classic authors are not accounts.** Robert's words allowed either "the name of the writers or the account of the writers". An account per author would mean changing each classic's owner, which the database forbids on purpose, and would give Eminescu a profile people could follow and message. The name on the work does what readers see without those problems.
- **The sign-up form refuses a bad username before sending,** so a person never confirms an email for an account that can't be made. The database still has the final word.
- **Email change needs both links** (Supabase's `double_confirm_changes`, already on). It is the safer choice for minors' accounts and costs one extra click.
- **No waiting time and no account gate on email changes,** as Robert asked ("whenever they want"). Supabase's own email rate limit still applies.

<details><summary>New Romanian lines (for Robert to read)</summary>

Discover (`discovery.json`):
- Cum facem clasamentul
- Populare (shelf, and the sort)
- Cele mai citite și apreciate (eyebrow)
- Noi și în ascensiune
- Scriitori noi (eyebrow)

Story page stats (`reading.json`):
- Cifrele poveștii (list name for screen readers)
- {{value}} apreciere / aprecieri / de aprecieri
- {{value}} comentariu / comentarii / de comentarii
- {{count}} capitol / capitole / de capitole
- Actualizată pe {{date}}

Staff Metrics (`staff.json`):
- Cifre (menu), "Cifrele testului din martie față de ținte, numărate în fiecare noapte." (home card)
- Cifre · {{productName}} (tab title)
- Cifre și jurnale (eyebrow)
- Cifrele testului din martie
- Totaluri numărate o dată pe noapte din baza de date. Nimic de aici nu numește o persoană.
- Țintele din martie
- Scriitori care au publicat / Conturi cu cel puțin un capitol publicat.
- Cititori înscriși / Conturi confirmate care nu sunt ale echipei.
- Rata de întoarcere / Citirile capitolului următor în primele lui 7 zile, ca parte din citirile capitolului dinainte.
- Aproximare
- Țintele sunt setări din baza de date, nu sunt fixate în cod.
- Ținta {{target}} · {{progress}}% din drum
- Cât s-a apropiat de țintă (progress bar name)
- Încă nenumărat
- Pe piețe / Scriitori care au publicat, pe țări / Alte țări
- Lectură / Citiri de capitole pe zi
- Încă nu s-a numărat nimic.
- Cifrele din martie sunt pentru proprietar și administratori. Cifrele cozii tale sunt pe pagina de moderare.
- Deschide coada de moderare
- Nu am putut încărca cifrele. Verifică conexiunea și încearcă din nou.
- Se încarcă cifrele…
- Cifrele nu au fost numărate încă. Numărătoarea rulează devreme, în fiecare dimineață.
- Numărate pe {{date}}


Sign-up (`auth.json`):
- Între 3 și 30 de caractere. Oamenii te găsesc și te menționează după el. Poți adăuga un pseudonim mai târziu.
- Verificăm linkul… / Mai ai un link de deschis / Acest link e gata. Acum deschide linkul trimis la cealaltă adresă și schimbarea e gata. Până atunci, adresa de acum merge în continuare.
- Adresa ta de email a fost schimbată / De acum înainte, te conectezi și primești emailurile noastre la adresa nouă. / Mergi la Setări
- Linkurile merg o singură dată și expiră după o oră. Cere din nou schimbarea în Setări ca să primești altele noi.

Settings, Email address (`account.json`):
- Adresa de email / Emailul tău:
- Doar tu o vezi. Nu apare niciodată pe profilul tău și nu le este arătată altor oameni.
- Se așteaptă schimbarea la {{email}}. Deschide linkurile trimise la ambele adrese ca să termini.
- Adresa de email nouă / Trimitem un link la adresa ta de acum și unul la cea nouă. Schimbarea se face după ce le deschizi pe amândouă.
- Schimbă emailul / Se trimite…
- Verifică ambele căsuțe: am trimis un link la {{email}} și unul la adresa ta de acum. Până le deschizi pe amândouă, adresa de acum merge în continuare.
- Aceasta este deja adresa ta de email. / Nu pare o adresă de email. Verific-o și încearcă din nou. / Un alt cont folosește deja această adresă. / Prea multe încercări. Așteaptă câteva minute, apoi încearcă din nou. / Nu am putut trimite linkurile. Verifică-ți conexiunea și încearcă din nou.

The email (`email.json`, subject "Confirmă schimbarea adresei de email"):
- Confirmă schimbarea adresei de email
- Cineva a cerut ca adresa de email a unui cont {{productName}} să fie înlocuită cu una nouă. Trimitem acest link atât la adresa veche, cât și la cea nouă, iar schimbarea se face doar după ce sunt deschise ambele linkuri. Până atunci, adresa veche merge în continuare.
- Confirm schimbarea

Classics (`reading.json`):
- Autorul / Un clasic din domeniul public. Autorul a murit în {{year}}.

</details>

## By hand

Nothing is needed before merging. After the merge, when Supabase's GitHub integration has applied the four migrations to staging:

0. **The email change template** (Supabase doesn't copy email templates to a hosted project). Supabase dashboard › staging project › Authentication › Emails › "Change email address": subject `Confirmă schimbarea adresei de email · Confirm the change of email address`, body: paste `supabase/templates/email_change.html` from main. Also under Authentication › Providers › Email, check "Secure email change" is on (both addresses must confirm).
0b. **The classics' authors:** SQL Editor › New query › paste `supabase/staging-topups/classic-authors.sql` from main › Run. Expect one row `after_classic_authors` with `classics_with_author 20, authors 11`.

1. In the SQL Editor, run `select jobname, schedule from cron.job where jobname in ('count-daily-metrics', 'compute-story-scores');`. You should see two rows: `7 4 * * *` and `13 * * * *`.
2. Log in as the owner, open Staff, then Metrics. The three numbers show with their targets (the migration counted the last 30 days once).
3. Open Discover. Popular and New and rising are near the top, and "How ranking works" opens the terms at section 5. If you'd rather not wait for the hourly run, `select public.compute_story_scores();` scores the stories at once.

## Follow-ups

- S1-E5-QA part two: the home page journey once S1-E5-08 is merged (CMS-1).
- Shares join the score with S1-E4-05; the weight is already there.
- The settings screen (S1-E11-03, after March) will let staff change the weights, targets and shelf order without a migration.
- A reads-per-day chart could replace the list later, keeping the numbers as text.
- Sorting a list by writer name still sorts classics under the classics account's name; a small change once the Classics shelf (S1-E5-06) is built.
- The classics account's own profile page still lists the classics under its own name; the Classics shelf (S1-E5-06, after March) is where readers will browse them.
- S1-E11-16 (#114): the "Add a classic work" form, Thursday 29 Oct.

The email change flow and the classics' author names add no new personal data (the address already lives in Supabase Auth; the authors died before 1956). The return rate and anything else touching minors' reading data: needs the lawyer's review before launch (the aggregate-only approach follows the 17 Oct 2026, 12:34 decision).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
