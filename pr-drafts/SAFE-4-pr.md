<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Closes #87
Closes #89
Closes #91
Closes #95
Closes #96
Closes #97
Closes #98
Closes #131
Closes #133

Bundle SAFE-4, the first of Robert's full-app plan (30 Oct 2026): the picture check on upload (S1-E10-05), claiming and the queue's search (S1-E10-03b), appeals (S1-E10-07), moderator mail (S1-E10-11), rate limits (S1-E10-12), editing the safety contacts (S1-E10-13b), the accessibility statement and the no-cookie check (S1-E14-03), and the epic checks for S1-E10 (round two) and S1-E14. With this, every story of epics S1-E10 and S1-E14 is built.

## What changed

### S1-E10-05: the picture check on upload

- **Database** (`…100001_s1_e10_05_enums.sql`, `…100003_s1_e10_05_picture_check.sql`): `picture_checks` (one row per file: status pending, passed, held, approved or removed; the labels and scores, never the picture), the private `avatars` bucket, `profiles.avatar_picture_id`, `register_picture()` (rate-limited), `record_picture_check()` (accepts only a result signed with the Vault secret `picture_check_secret`), the `picture` reportable type and its branches. A held picture opens a moderation case; a known abuse match opens a same-day safeguarding case and is kept six months. Readers see a picture only once it passed or a moderator approved it.
- **Server:** `POST /api/picture-check` (`functions/api/picture-check.ts`, `server/picture-check.ts`) reads the file with the uploader's own token and asks the provider chosen by `PICTURE_CHECK`: `stub` (default; passes unless the name ends `_fail`, `_gore`, `_match` or `_down`) or `real` (Sightengine for nudity and gore, Arachnid Shield for known abuse material; adapters in `server/picture-check/`).
- **Screens:** "Upload a picture" in Story settings › Cover and "Profile picture" in Settings, both only while `picture_uploads` is on (it stays off until GO-LIVE). Covers and avatars show everywhere a cover or avatar is drawn, falling back to the drawn cover or initials until the picture is visible. A pending check is retried up to five times. The case page shows the picture blurred until "Show the picture"; a known match is never shown.

### S1-E10-03b: claiming and the queue's search

- `admin_claim_case()` and `admin_release_case()`: a claim says who is on it for an hour and never locks anyone out; "Take over" is logged. The queue gains the reason and claimed filters, a search by case reference or username, and a "Claimed by" pill.

### S1-E10-07: appeals

- **Database** (`…100006_s1_e10_07_appeals.sql`): `appeals`, `submit_appeal()` (six months, one open appeal per statement, rate-limited), `admin_appeals_queue()` and `admin_decide_appeal()` (a moderator never decides an appeal on their own decision while someone else could; overturning restores the item, lifts the sanction and approves a removed picture). The person is notified either way (`appeal_decided`).
- **Screens:** "Appeal this decision" on each statement in My reports and decisions, with the outcome once decided; `/staff/appeals` for owner, admin and moderators.

### S1-E10-11: moderator mail

- **Database** (`…100005_s1_e10_11_moderator_mail.sql`): threads and messages in one shared inbox, internal notes, assign and status, every staff step logged without the words. A suspended account can still write.
- **Screens:** `/moderator-mail`, `/moderator-mail/new` (a decision's reference can travel with it) and the thread for members; `/staff/moderator-mail` for moderation staff. Replies are signed "The moderation team" and notify the member (`moderator_mail_reply`).

### S1-E10-12: rate limits

- `take_rate_limit(action)` with per-action hourly limits from the `rate_limits` setting, lower for accounts under 24 hours old; 54000 with `wait_minutes:<n>` in the hint, and every form says how long to wait. The report limit now says it too. A new account's comment may hold one link (the comment box says why it was refused). Events are purged after two days.

### S1-E10-13b: editing the safety contacts

- **Database** (`…100007_s1_e10_13b_safety_contacts_admin.sql`): Romanian opening hours, who last confirmed each contact, `admin_save_safety_contact()`, `admin_confirm_safety_contact()`, `admin_remove_safety_contact()` (each logged with before and after values), the monthly check per market (pg_cron, the 1st) and the 45-day warnings. `my_staff_areas()` now returns the caller's own access.
- **Screens:** `/staff/safety-contacts` for support, admins and the owner (moderators read); a warning at the top of every staff page while a contact is 45 days unchecked. The public block shows the Romanian opening hours in Romanian.

### S1-E14-03: the accessibility statement and the no-cookie check

- `/legal/accessibility`, the fifth Legal centre document (draft, both languages, built from `content/legal/05-accessibility-statement.md`), linked from every footer.
- `npm run third-party:check` (`scripts/check-third-party.ts`) fails the build check on any web address in the bundle on a host nobody reviewed; it runs in CI after the build and in `npm run checks`.
- `e2e/accessibility-statement.spec.ts` visits the main pages signed out and signed in and fails on any cookie or unreviewed storage key.

### Epic checks

- `e2e/epic-s1-e10-round-2.spec.ts`: report → search and claim → hide → appeal → an admin changes the decision → ask the moderators. `e2e/epic-s1-e14.spec.ts`: all five legal documents, Write to us and Contact us, with no cookie. Reports in `docs/epic-reports/S1-E10.md` (round two) and `S1-E14.md`.

### Shared

- The staff home page gives each page its own description (Moderation and Classics showed raw keys before).
- Docs: code tour, mocks, retention (pictures, appeals, moderator mail, rate-limit events, safety checks), feature READMEs (pictures, moderator mail, moderation, statements, safety) and lawyer notes.

## Acceptance criteria

| Criterion | Test |
| --- | --- |
| **S1-E10-05** Every uploaded picture is checked before anyone else sees it | `164`; `server/picture-check.test.ts`; `e2e/picture-check.spec.ts` |
| A flagged picture is held, the uploader is told and a moderation case opens | `164`; `e2e/picture-check.spec.ts` |
| A known abuse match is never shown, opens a safeguarding case and is kept six months | `164`; `picture-check-adapter.test.ts` |
| A service that is down leaves the picture private and it is tried again | `164`; `picture-check-adapter.test.ts` |
| Policies on `picture_checks`: allowed and denied | `164` |
| **S1-E10-03b** A moderator claims and releases a case; others see who is on it | `165`; `e2e/epic-s1-e10-round-2.spec.ts` |
| The queue filters by reason and claim, and searches by reference or username | `165`; `e2e/epic-s1-e10-round-2.spec.ts` |
| **S1-E10-07** The person appeals within six months; a different moderator decides where possible; the person is told the outcome | `166`; `notificationText.test.ts`; `e2e/appeals-and-mail.spec.ts`; `e2e/epic-s1-e10-round-2.spec.ts` |
| Overturning restores the item and lifts the sanction | `166`; `e2e/epic-s1-e10-round-2.spec.ts` |
| Policies on `appeals`: allowed and denied | `166` |
| **S1-E10-11** A member writes to one shared inbox; staff assign, note and reply as the team; the member never sees the note or who wrote | `167`; `e2e/appeals-and-mail.spec.ts` |
| Policies on the mail tables: allowed and denied | `167` |
| **S1-E10-12** Over the hourly limit an action is refused with the minutes to wait; new accounts get lower limits and one link per comment | `168` |
| Policy `rate_limit_events_select_own`: allowed and denied | `168` |
| **S1-E10-13b** Support edits contacts in both languages and every change is logged | `169`; `e2e/safety-contacts-admin.spec.ts` |
| A monthly check per market closes once every contact is confirmed | `169`; `e2e/safety-contacts-admin.spec.ts` |
| A contact unchecked for 45 days warns staff | `169`; `e2e/safety-contacts-admin.spec.ts` |
| Policy `safety_contact_checks_select_staff`: allowed and denied | `169` |
| **S1-E14-03** The accessibility statement is published and linked from every page | `e2e/accessibility-statement.spec.ts`; `e2e/epic-s1-e14.spec.ts` |
| No cookie and no unreviewed third party | `npm run third-party:check`; `e2e/accessibility-statement.spec.ts` |
| **S1-E10-QA, S1-E14-QA** The epic journeys pass | `e2e/epic-s1-e10-round-2.spec.ts`; `e2e/epic-s1-e14.spec.ts` |

## Definition of Done

- **Code:** strict TypeScript, no `any`, ESLint limits and Prettier pass. Header and doc comments on every file and function.
- **Types:** regenerated (`types:check` passes).
- **Tests:** every criterion has a test; every new policy has an allowed and a denied pgTAP test (`check-policy-tests` passes).
- **Accessibility:** axe at 390, 768 and 1440 px, light and night, ro and en, on Staff › Appeals, Staff › Moderator mail, the member's messages, Staff › Safety contacts, Settings with the upload field and the accessibility statement.
- **Design rules:** staff screens have no doodles; label and value lists have row lines; drop-downs follow the one style.
- **Privacy:**
  - New personal data: uploaded pictures and their check results, appeals, moderator mail, rate-limit events, who confirmed a safety contact. Retention rows and lawyer notes are in this pull request.
  - No picture is ever sent anywhere but the two checking services; nothing is logged.
  - Replies never name the staff member. No user ID on any public answer.
- **Security:**
  - Staff checks run in the database (`staff_may()`, `may_see_case()`); a check result is accepted only when signed with the Vault secret.
  - RLS and explicit grants on every new table and bucket.
  - Every staff action goes in the audit log.
  - The picture check uses the uploader's own token, never a service key.
- **i18n:** every string in ro and en, with ș and ț.
- **Docs:** code tour, retention, mocks, epic reports, feature READMEs, lawyer notes.

## Local check run

One clean-start run (`npm ci`, Supabase stopped and started, `npm run build`, `npm run checks`, functions build) on `b8e3293`:

| Check | Result |
| --- | --- |
| `npm run lint` | pass |
| `npm run typecheck` | pass |
| `npm run types:check` | pass |
| `npm test` (Vitest) | 101 files, 649 tests pass |
| `npx supabase db reset` then `npx supabase test db` | 79 files, 1,690 tests pass |
| `npm run test:e2e` | 914 pass, 3 failed, 13 didn't run (serial follow-ons), 1 skipped |
| `npm run i18n:check`, `npm run migrations:check` | pass |
| `npm run build`, `npm run third-party:check` | pass (new) |
| Functions build | compiles |

The 3 failures:
- **The S1-E11 epic check** still listed the old staff menu. It now lists Moderator mail, Appeals and Safety contacts (`8a6580f`).
- **Staff › Safety contacts at 390 px in Romanian** scrolled sideways: the kind "Raportează materiale cu abuz sexual asupra copiilor" sat in a pill, and pills never wrap. It is now a small line above the name, and long links break (`8a6580f`).
- **The reader's "first paragraph within 2 seconds on a throttled phone"** measured over 2 seconds. It fails the same way on `main` on this machine (#207) and is left as it is.

After `8a6580f`, `safety-contacts-admin.spec.ts` (with all 12 axe views) and `epic-s1-e11.spec.ts` ran again and all 15 pass; the 13 that didn't run were their serial follow-ons.

## Screenshots

Taken at 390, 768 and 1440 px (not attached: the session can't upload images):
- `/staff/safety-contacts` as support: "This month's checks", the country picker and Romania's eight contacts, each with its kind, number, link, opening hours in both languages, how sure the source is and "Last checked … by research G4", with Still right, Change and Remove. At 390 px everything stacks and long links break.
- `/staff/appeals` and `/staff/moderator-mail` as admin: the intro, the status filter and "No appeal matches this filter" / the empty inbox with its two filters.
- `/moderator-mail/new` as adult_writer: Subject, Your message (up to 4,000 characters) and Send.
- `/legal/accessibility`: the fifth tab, "Accessibility statement" marked as a draft, five sections with the short version over the full text, and Accessibility in the footer.

## Decisions taken

- **Uploads stay off** (`picture_uploads`) until the real checking services are set up; locally and in tests the stub provider runs.
- **A cover can be uploaded only in Story settings**, once the story exists; New story says so.
- **A pending check is retried up to five times**, from the uploader's browser (Cloudflare Pages has no scheduler).
- **Claims are advisory**, for an hour, never a lock; "Take over" is logged.
- **Staff pages:** `/staff/appeals`, `/staff/moderator-mail` and `/staff/safety-contacts`, each its own menu item.
- **Appeals and moderator mail limits** are 4,000 characters, as the database's.
- **The monthly safety check is a row on Staff › Safety contacts** until support tickets exist (S1-E11-13, ADMIN-2).
- **Moderator mail is kept one year** after the thread's last update (proposal, for the lawyer).
- **The third-party check reads the build**, so a new host in a library fails it too; each allowed host carries its reason.

<details><summary>New Romanian lines (for Robert to read)</summary>

Pictures: "Încarcă o imagine" · "JPEG, PNG sau WebP, până la 5 MB. Se potrivește cel mai bine o imagine înaltă (5 pe 8). Cititorii o văd după ce trece verificarea imaginilor." · "Încarcă doar o imagine făcută de tine sau pe care ai dreptul s-o folosești." · "Îți încărcăm și verificăm imaginea…" · "Imaginea ta a trecut verificarea." · "O persoană din echipa de moderare se va uita la imagine înainte ca alții s-o vadă. Te anunțăm." · "Imaginea e încărcată. O verificăm cât mai repede; până atunci o vezi doar tu." · "Încarcă o poză de profil" · "Poza de profil"

Appeals (member): "Poți contesta această decizie până pe {{date}} (șase luni). Contestația e gratuită." · "Spune-ne de ce decizia e greșită. Un alt moderator o analizează, când se poate, și îți scriem cu rezultatul." · "Contestă decizia" · "De ce e greșită decizia?" · "Trimite contestația" · "Contestația ta {{reference}} a fost trimisă pe {{date}}. Un moderator o analizează; îți scriem cu rezultatul." · "Termenul de contestare s-a încheiat pe {{date}}." · "Pune o întrebare moderatorilor"

Notifications: "contestația ta {{reference}} așteaptă un moderator." · "un alt moderator s-a uitat din nou la contestația ta {{reference}}. Decizia rămâne." · "un alt moderator s-a uitat din nou la contestația ta {{reference}} și a schimbat decizia." · "ți-a răspuns la mesaj." · "Citește răspunsul"

Moderator mail: "Mesaje către moderatori" · "Scrie echipei de moderare despre o raportare, o decizie sau contul tău. Fiecare mesaj ajunge la toată echipa și îți răspunde un om." · "Scrie moderatorilor" · "Spune-ne despre ce e vorba. Te rugăm să nu incluzi parole sau date private ale altcuiva." · "Subiect" · "Mesajul tău" · "Trimis. Referința ta este {{reference}}. Te anunțăm când îți răspunde echipa."

Comments: "Conturile noi pot pune un singur link într-un comentariu în prima zi. Scoate un link și publică din nou."

Staff, claims and appeals: "Cine se ocupă" · "Ai preluat cazul. Ceilalți văd că e al tău în următoarea oră." · "Preia cazul" · "Preia tu" · "Eliberează" · "Contestații" · "Oamenii pot contesta o decizie timp de șase luni. Decide un alt moderator, când se poate. Schimbarea deciziei readuce ce a fost ascuns sau eliminat și ridică sancțiunea; persoana e anunțată în ambele cazuri." · "Tu ai luat decizia inițială, așa că altcineva decide contestația." · "Ce îi spunem persoanei"

Staff, safety contacts: "Contacte de siguranță" · "Aceste numere și linkuri apar în fiecare formular de raportare și în paginile de ajutor. Verifică-le lunar la sursa oficială, apoi confirmă-le sau schimbă-le." · "Verificările lunii" · "E încă bun" · "Salvează și marchează ca verificat" · "Un contact de siguranță nu a fost verificat de {{days}} de zile." · "Verifică-le acum"

Legal: "Accesibilitate" · "Declarație de accesibilitate" · "Cum respectă {{productName}} WCAG 2.2 AA, ce nu funcționează încă și cum ne poți spune despre o barieră."

The rest are in `mail.json`, `moderation.json` › `claims`, `picture`, `appeals`, `safety.json` › `admin` and `staff.json`. The accessibility statement's own Romanian draft is in `content/legal/ro/05-accessibility-statement.md`.

</details>

## By hand

- **Nothing on staging now:** no SQL top-up (the seed is unchanged) and no new secret is needed while uploads stay off.
- **GO-LIVE:** the picture check's steps (Sightengine, Arachnid Shield, `picture_check_secret`, the Cloudflare secrets and `PICTURE_CHECK=real`) are in `pr-drafts/by-hand-for-robert.md`.

## Follow-ups

- Keep the safeguarding evidence pack in the private `evidence` bucket (from SAFE-3).
- Link the monthly safety check to support tickets with S1-E11-13.
- Restrict as a decision still waits for S1-E11-08.
- A paging service for the on-call alert (SAFE-3).

## For the lawyer

Six points added to `docs/for-the-lawyer.md` under "Found while building SAFE-4": the two picture-checking processors, a known abuse match, appeals, moderator mail as the single point of contact, rate limits and the accessibility statement. Needs the lawyer's review before launch.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
