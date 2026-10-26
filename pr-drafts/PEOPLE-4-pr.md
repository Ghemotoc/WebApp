<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of #114 (S1-E11-16 part 16a: the staff Classics page; imports, the 1 January suggestions and typo versions are 16b)
Follows on #13 (Robert, 25 Oct 2026: change the email with codes, not links)
S1-E2-12 and S1-E2-13 have no issue yet: they are Robert's additions of 25 Oct 2026 (the optional birthday and the anniversary greeting).

Bundle PEOPLE-4: the email change by two 6-digit codes, an optional birthday, a greeting line on Discover, and the staff "Add a classic work" page.

## What changed

### S1-E2-05 follow-up: change the email with two codes

- Settings › Email address now sends a 6-digit code to the current address and another to the new one. The person types both; the change happens only when both are right (`verifyOtp({ type: 'email_change' })` once per address).
- The `email_change` template shows `{{ .Token }}` instead of a button, in Romanian and English. The old link page branch is gone.
- Wrong or expired codes, sending new codes and a lost connection each get their own plain message.

### S1-E2-12: an optional birthday

- `profiles.birthday_month` and `birthday_day`, never with a year (CLAUDE.md rule 5 allows it because it isn't a full date of birth). Only the owner reads them, through `profiles_select_own`.
- Settings › Birthday: month, and the day if the person wants. `set_my_birthday()`.
- Staff "Correct birthday" on the account page (owner, admin, moderator), with a reason, logged: `admin_set_birthday()`. Staff never see the saved birthday; they type the one the person gave them.
- The year of birth set at sign-up is locked by a trigger: nobody, staff included, changes it.
- Privacy notice draft line, retention row and a lawyer note.

### S1-E2-13: a greeting line on Discover

- `my_greeting()` picks, in order: "Happy birthday" on the day, "Happy birthday month" all month, the joining anniversary from year one, then good morning, afternoon or evening by the reader's own clock (board 3.1).
- Signed-in readers only; nobody else learns anything from it.

### S1-E11-16 part 16a: Classics for staff

- `/staff/classics` for owner and admin (board 8.16): add a work with its real author (picked or added with the year of death), the source and credit, the translator where there is one, then paste the text, which is split into chapters to check before publishing.
- The public-domain check shows where the work is free (Romania, the EU, the UK, the US). Publishing is refused unless it is free in Romania; `classic_free_markets()` keeps it from readers in markets where it isn't.
- Works are owned by the official classics account and show the real author (PEOPLE-3). Publish and unpublish are logged.
- Tables and functions: `classic_works`, `admin_add_classic_author()`, `admin_save_classic_work()`, `admin_set_classic_chapters()`, `admin_publish_classic()`, `admin_unpublish_classic()`, `admin_list_classics()`, `admin_list_classic_authors()`.

### Found by the check run and fixed here

- **A just-picked language could be switched back.** If the account's language was read while a new choice was still saving, the old language came back. The choice now wins until it is saved (`profileLocale.ts`). Found by the S1-E1 epic check.
- The two staff-menu tests now expect Classics. The writer profile's twelve axe scans get 90 seconds instead of 30.

## Acceptance criteria

| Criterion | Test |
| --- | --- |
| The email changes only after both 6-digit codes are typed | `emailAddress.test.ts`; `e2e/email-change.spec.ts` (Mailpit: both codes, log in with the new address) |
| A wrong or expired code is refused in plain words, and new codes can be sent | `emailAddress.test.ts`; `e2e/email-change.spec.ts` |
| A person adds a birthday month, and a day if they want; never a year | `159`; `birthday.test.ts`; `e2e/birthday.spec.ts` |
| Only the owner sees the birthday; staff correct it with a logged reason | `159`; `e2e/birthday.spec.ts` |
| The year of birth can't be changed by anyone | `159` |
| Discover greets the reader on their birthday, in their birthday month and on their joining anniversary | `159`; `greeting.test.ts`; `e2e/birthday.spec.ts` |
| Staff add a classic with its real author, source and text, and see where it is free | `160`; `splitClassicText.test.ts`; `publicDomain.test.ts`; `e2e/classics.spec.ts` |
| A work not free in Romania can't be published; readers in a market where it isn't free don't see it | `160` |
| Only owner and admin manage classics; every change is logged | `160`; `e2e/classics.spec.ts` |
| Policy `classic_works_select_staff`: allowed for the admin, denied for a moderator | `160` |

## Definition of Done

- **Code:** strict TypeScript, no `any`, ESLint limits and Prettier pass. Header and doc comments on every file and function.
- **Types:** regenerated (`types:check` passes).
- **Tests:** every criterion has a test; every new policy has an allowed and a denied pgTAP test (`check-policy-tests` passes).
- **Accessibility:** axe at 390, 768 and 1440 px, light and night, ro and en, on Settings, Discover and Classics.
- **Design rules:** staff screens have no doodles; label and value lists have row lines; drop-downs follow the one style.
- **Privacy:** the birthday is new personal data: retention row, privacy notice draft line and the lawyer note are in this pull request. No user ID on any public answer.
- **Security:** staff checks in the database (`staff_may()`), RLS and explicit grants on every table, audit log for every staff change.
- **i18n:** every string in ro and en, with ș and ț.
- **Docs:** code tour, retention, mocks, board fixes, feature READMEs, lawyer notes.

## Local check run

Clean start on `7392616` (`npm ci`, Supabase stopped and started, `npm run build`, `npm run checks`, functions build):

| Check | Result |
| --- | --- |
| `npm run lint` | pass |
| `npm run typecheck` | pass |
| `npm run types:check` | pass |
| `npm test` (Vitest) | 98 files, 611 tests pass |
| `npx supabase db reset` then `npx supabase test db` | pass |
| `npm run test:e2e` | 730 pass, 7 failed, 55 didn't run (serial follow-ons) |
| `npm run i18n:check`, `npm run migrations:check` | pass |
| Functions build | compiles |

The 7 failures, and what happened to each:
- 3 were real and are fixed in `872ae0e`: the language race (S1-E1 epic check) and the two staff-menu lists. Re-run on their own: pass.
- 2 were timing in the same race (the notifications page in Romanian; Discover's shelf order). Re-run on their own after the fix: pass.
- The writer profile's twelve axe scans took longer than 30 seconds. They fail the same way on `main` on this machine today; with a 90-second limit: pass.
- **The reader's "first paragraph within 2 seconds on a throttled phone" measured 2.2 to 2.3 seconds. It fails the same way on `main`** (built in a separate worktree, same machine: 2,310 ms), so this bundle didn't cause it; the machine is slower today. Left as it is rather than loosening the budget. Follow-up below.

After `872ae0e`, these files were run again on their own: `epic-s1-e1`, `epic-s1-e11`, `notifications`, `ranking`, `staff-shell`, `writer-profile`: 93 pass plus the two above. Lint, typecheck and the language unit tests pass.

## Screenshots

Taken at 390, 768 and 1440 px (not attached: the session can't upload images):
- `/settings` as adult_writer: the Email address panel with the code hint, and the new Birthday panel (month, day, Save), stacked cleanly at 390 px.
- `/discover` as adult_writer: "Good morning, Lia Scrie." above the Discover eyebrow.
- `/staff/classics` as admin: Classics in the staff menu between Users and Roles, the intro and "Add a classic work".

## Decisions taken

- **Codes, not links, for an email change** (Robert, 25 Oct 2026, 09:15). Both addresses must prove access, so a stolen session alone can't move the account.
- **The birthday never has a year**, and the year of birth from sign-up stays locked (Robert, 25 Oct 2026, 07:08 to 07:11). Someone who entered the wrong year deletes the account and joins again.
- **Staff correct a birthday without seeing it**: they type what the person told them, so the panel shows no birthday to staff.
- **The greeting uses the reader's own clock** for morning, afternoon and evening, and the Romanian date for birthdays and anniversaries.
- **Classics 16a is the form and the check only.** Imports, the 1 January suggestions and typo versions stay in #114 for 16b.
- **A work must be free in Romania to be published at all**, because Romania is the open market; other markets are filtered for readers.

<details><summary>New Romanian lines (for Robert to read)</summary>

Settings, email change: "Trimitem un cod de 6 cifre la adresa ta actuală și altul la cea nouă. Schimbarea se face după ce le scrii pe amândouă." · "Scrie cele două coduri" · "Codul de la adresa actuală" / "Codul de la adresa nouă" · "Confirmă schimbarea" · "Codul acesta este greșit sau a expirat. Verifică-l sau trimite coduri noi." · "Trimite coduri noi" · "Gata. Adresa ta de email este acum {{email}}."

Email template: "Codul tău pentru schimbarea adresei de email" · "Codul tău pentru această adresă:" · "Codul merge o singură dată și expiră după o oră."

Settings, birthday: "Ziua de naștere" · "Adaugă-ți ziua de naștere dacă vrei să te felicităm: îți urăm la mulți ani toată luna și la mulți ani în ziua ta. Luna e de ajuns; ziua o adaugi dacă vrei." · "O vezi doar tu și nu are niciodată un an. Anul nașterii de la înscriere rămâne cum e și nu poate fi schimbat." · "Salvează ziua de naștere"

Greeting: "Bună dimineața, {{name}}." · "Bună ziua, {{name}}." · "Bună seara, {{name}}." · "La mulți ani, {{name}}!" · "Lună de naștere fericită, {{name}}!" · "La mulți ani pe {{productName}}, {{name}}!"

Staff: "Corectează ziua de naștere" · "Folosește asta doar când persoana a cerut-o. Alege ziua de naștere pe care ți-a dat-o; „Nesetată” o șterge. Anul nașterii nu se schimbă niciodată."

Classics: "Clasice" · "Adaugă cărți, povestiri, poezii și piese de teatru din domeniul public. O operă apare pe contul oficial de clasice, cu autorul ei real, și doar acolo unde e liberă." · "Adaugă o operă clasică" · "Unde e în domeniul public" · "Liberă / Încă nu / Necunoscut" · "Opera nu e încă în domeniul public în România, așa că nu poate fi publicată." · "Dacă textul e o traducere, scrie traducătorul și anul morții lui: o traducere rămâne protejată 70 de ani după moartea traducătorului." and the other form labels in `staff.json` › `classics`.

</details>

## By hand

- **Staging email template:** paste the new `supabase/templates/email_change.html` into Supabase › Authentication › Email Templates › Change Email Address (replaces the link version). This goes away with S1-E11-19.
- **Production classics account:** the official classics account must exist in production before staff can publish a classic (the page says so if it's missing).
- **Privacy notice:** the birthday line goes into the next legal version (`content/legal/`), after the lawyer's check.

## Follow-ups

- S1-E11-16b: imports from public sources, the 1 January "newly free" suggestions and typo versions.
- Hiding a classic per market on the staff page (today the check decides).
- Sorting the Classics list by author.
- Listing the classics on the official account's profile.
- The reader's 2-second budget on a slow build machine: measure on CI once Actions run again (1 November) before deciding whether the test or the reader needs work.

## For the lawyer

Two points added to `docs/for-the-lawyer.md`: storing an optional birthday (month and day, no year) for minors, and the anniversary greeting. Needs the lawyer's review before launch.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
