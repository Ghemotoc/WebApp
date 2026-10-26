<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Closes #88
Closes #93
Closes #94

Bundle SAFE-3: statements of reasons for every moderation decision (S1-E10-04), acting on terrorist content removal orders within the hour (S1-E10-09) and the safeguarding path for a young person in danger (S1-E10-10).

## What changed

### S1-E10-04: statements of reasons, and telling reporters the outcome

- **Database** (`…100001_s1_e10_04_enums.sql`, `…100002_s1_e10_04_statements_of_reasons.sql`):
  - New table `statements_of_reasons`: the stored copy of every statement. It holds what was done, to what, the facts in the moderator's words, the rule or law, whether automated means were used, the language and the six-month challenge window. It is append-only: nobody updates or deletes a row, owner included.
  - `admin_decide_case()` and `admin_apply_sanction()` gain `message_to_person`. Every decision other than "No action" now issues a statement before the case is marked decided, so the decision's notification links to it. A sanction from a case shares the case's statement, so nobody gets two.
  - A raised rating or the undisclosed-AI label (S1-E3-06's queued job) becomes a statement at once.
  - Each reporter gets a `report_outcome` notification: "removed", "acted on" or "no breach found". It never names someone else's sanction.
  - Notifiers who used the public form are queued for a decision email: `admin_due_decision_emails()` and `admin_mark_decision_emails_sent()`.
  - `my_statements()` and `my_reports()` feed the new page. `admin_case_statements()` feeds the case page.
- **Server:** `POST /api/decision-emails` (`functions/api/decision-emails.ts`, `server/decision-emails.ts`) sends the due emails in the notifier's language with the moderator's own sign-in token, then marks them sent. An authority's email confirms the removal and its time. Nothing is logged.
- **Screens:**
  - `/my-reports` "My reports and decisions" (board 6.5): each statement (what we did, why, the rule, how we found it, until when it can be challenged) and each report sent with its outcome. "Challenge the decision" opens Contact us with the reference filled in.
  - The decision form and the account actions ask "What we tell the person". The case page shows the stored statement.
  - The queue shows "Send waiting decision emails" when any failed.
  - Notifications: a decision links to "Read why"; a report outcome has its own line.

### S1-E10-09: removal orders within the hour

- **Database** (`…100003_s1_e10_09_removal_orders.sql`):
  - New table `on_call_rota`. Shifts never overlap, and only people with the on-call permission take one. Owner and admin edit it, all staff read it, and every change is logged.
  - `on_call_alerts` records who was on call, when the alert went out, who acknowledged it and when it was escalated.
  - `escalate_on_call_alerts()` runs every minute on pg_cron and escalates an alert nobody acknowledged within 15 minutes. The phone call is still a logging stub (`docs/mocks.md`).
  - `admin_emergency_disable()` does three things in one action: it removes the item everywhere, decides the case and keeps the item six months (`preserve_until`; the purge jobs skip it). It tells the uploader unless the order forbids it. Every timestamp goes in the audit row.
  - `admin_order_timeline()` returns the order's times as proof.
- **Screens:**
  - The case page's removal-order panel: the timeline (received, deadline, alerted, acknowledged, escalated, removed, kept until, authority told, uploader told) and Emergency disable with the "Tell the uploader" box.
  - Acknowledge on the queue's alert.
  - `/staff/on-call`: who is on call now, the shifts, the gaps in the next 14 days, and Add or Remove a shift. Moderators and support only read it.
- **Runbook:** `docs/runbooks/removal-orders.md`.

### S1-E10-10: safeguarding

- **Database** (`…100004_s1_e10_10_safeguarding.sql`):
  - `admin_mark_safeguarding()` moves any case into the safeguarding lane; after that only staff with the safeguarding permission see it.
  - `admin_case_support_contacts()` returns the child helpline and emergency numbers for the account's country. Romania's are the fallback, and the gap is noted.
  - `admin_build_evidence_pack()` returns the content, account data, reports and timestamps as one JSON document, logged as a sensitive read.
  - New table `safeguarding_referrals`, with `admin_log_referral()` and `admin_case_referrals()`.
- **Screens:**
  - The case page's safeguarding panel: the checklist, the support contacts, "Build the evidence pack" (downloads `evidence-<reference>.json`) and the referral log.
  - "Move to safeguarding" on any other open case.
- **Runbook:** `docs/runbooks/safeguarding.md`.

### Shared

- Seed and staging top-up: the owner persona gets the on-call permission and a 30-day shift.
- Tests that decide cases fill the new message field. The staff menu tests list "On call".
- Docs: code tour, mocks, retention (statements, referrals, preserved items, the rota), board fixes (4 rows) and lawyer notes.

## Acceptance criteria

| Criterion | Test |
| --- | --- |
| **S1-E10-04** A removal, restriction, suspension or ban sends the person a statement in their language with the action, the facts, automated means, the rule or law and how to challenge it | `161` (sections 1, 2, 4, 5); `notificationText.test.ts`; `e2e/statements.spec.ts` |
| The notifier is told the outcome (reporters in the app; public-form notifiers by email) | `161` (section 3); `decision-emails.test.ts`; `e2e/statements.spec.ts` |
| A copy of every statement is stored with the case | `161` (sections 1, 2) |
| Policies `statements_of_reasons_select_own` and `statements_of_reasons_select_moderation`: allowed and denied | `161` |
| **S1-E10-09** An order saved through the authority path alerts the person on call | `162`; `e2e/removal-orders.spec.ts` (the owner acknowledges the alert) |
| Exactly one person with the on-call permission is on call at a time; an alert not acknowledged in 15 minutes goes to the rest of the team | `162`; `e2e/removal-orders.spec.ts` (add and remove a shift) |
| Emergency disable makes the content unavailable everywhere in one action | `162`; `e2e/removal-orders.spec.ts` |
| The content is kept six months and every timestamp is logged | `162` |
| The uploader is told when the order allows it | `162`; `e2e/removal-orders.spec.ts` |
| Policy `on_call_rota_select_staff`: allowed and denied | `162` |
| **S1-E10-10** A safeguarding case shows the checklist and support contacts, with the country's child helpline (Romania's as the fallback) | `163`; `e2e/safeguarding.spec.ts` |
| A credible threat produces an evidence pack and logs the referral | `163`; `e2e/safeguarding.spec.ts` |
| Only safeguarding-trained staff see a safeguarding case, including one moved there | `163`; `e2e/safeguarding.spec.ts` |
| Policy `safeguarding_referrals_select_safeguarding`: allowed and denied | `163` |

## Definition of Done

- **Code:** strict TypeScript, no `any`, ESLint limits and Prettier pass. Header and doc comments on every file and function.
- **Types:** regenerated (`types:check` passes).
- **Tests:** every criterion has a test; every new policy has an allowed and a denied pgTAP test (`check-policy-tests` passes).
- **Accessibility:** axe at 390, 768 and 1440 px, light and night, ro and en, on My reports and decisions, the case page panels and the on-call rota.
- **Design rules:** staff screens and the reporting page have no doodles; label and value lists have row lines; drop-downs follow the one style.
- **Privacy:**
  - Personal data: statements and referrals are new; the evidence pack holds the account's email.
  - Records: retention rows and the lawyer notes are in this pull request.
  - The reporter never learns the other person's sanction. No user ID on any public answer.
- **Security:**
  - Staff checks run in the database (`staff_may()`, `may_see_case()`).
  - RLS and explicit grants on every new table; statements are append-only.
  - Every staff change and the evidence pack go in the audit log.
  - The decision emails use the moderator's token, never a service key.
- **i18n:** every string in ro and en, with ș and ț. The decision email texts are draft text that moves into the admin-editable templates with S1-E11-19.
- **Docs:** code tour, retention, mocks, board fixes, feature READMEs, two runbooks, lawyer notes.

## Local check run

Two clean-start runs (`npm ci`, Supabase stopped and started, `npm run build`, `npm run checks`, functions build). The second ran on `6d87cbe`:

| Check | Result |
| --- | --- |
| `npm run lint` | pass |
| `npm run typecheck` | pass |
| `npm run types:check` | pass |
| `npm test` (Vitest) | 99 files, 622 tests pass |
| `npx supabase db reset` then `npx supabase test db` | 73 files, 1,561 tests pass |
| `npm run test:e2e` | 826 pass, 3 failed, 5 didn't run (serial follow-ons), 1 skipped |
| `npm run i18n:check`, `npm run migrations:check` | pass |
| Functions build | compiles |

**First run (`b6c785d`):** 768 passed and 5 failed. Four were this bundle's and are fixed in `6d87cbe`:
- the on-call test matched two Remove buttons;
- the safeguarding test reported twice as the same person, and a second report within a day only returns the first;
- a hand-closed case lacked its moderator;
- two screen-reader names didn't start with the button's visible words: "Challenge this decision" and the older "Ask for more details".

**Second run:** every SAFE-3 test passes. The 3 failures:
- **Discover's shelf order** (`ranking.spec.ts`) read the headings before every shelf had loaded. It fails the same way on `main`. It now waits for both shelves it reads (`3deca5f`) and passes.
- **The Email panel's twelve axe scans** took 31.8 seconds against a 30-second limit. They passed on their own, and now have 90 seconds, as the writer profile's do (`3deca5f`).
- **The reader's "first paragraph within 2 seconds on a throttled phone"** measured over 2 seconds again. It fails the same way on `main` on this machine (see #207). It is left as it is, and the follow-up is in #207.

After `3deca5f`, `ranking.spec.ts` and `email-change.spec.ts` ran again on their own and pass. Lint passes.

## Screenshots

Taken at 390, 768 and 1440 px (not attached: the session can't upload images):
- `/my-reports` as `blocked`, after a moderator warned the account: two "We warned your account" cards, each with About, What we did, Why (the moderator's words, or "The moderator didn't add more details"), The rule and How we found it in rows with fine lines. Below them: "You can challenge this until April 26, 2027 (six months)", "Challenge this decision", then the report they sent with "Waiting for a moderator". It stacks cleanly at 390 px.
- Case `TCO-0001` (the seeded removal order) as owner: the Removal order panel with the timeline, the case-log note, "Tell the uploader" ticked, the message to the uploader and Emergency disable, above the usual Decision form.
- Case `R-000007` (sexual content involving a minor) as owner, at 768 px: the Safeguarding panel with the six-step checklist, Romania's support contacts (112, SMS 113, Telefonul Copilului 116 111, Ora de Net), the evidence pack button and the referral log form.
- `/staff/on-call` as owner: "On call now: @owner.", the shift with Remove, "Someone is on call for the whole of the next 14 days" and Add a shift. "On call" sits in the staff menu after Moderation.

Seen in the screenshots, left for a follow-up: the order's timeline shows Romania time with seconds while the case header above it shows the browser's time; and before any decision the "Uploader told" row says "No" where "Not yet" would read better.

## Decisions taken

- **The statement lives on "My reports and decisions"** (`/my-reports`, board 6.5), with one card per decision, instead of a page per statement. A notification links to its card.
- **Appeals wait for S1-E10-07** (after March). Until then "Challenge the decision" opens Contact us with the reference filled in, and a different moderator answers where possible.
- **Reporters learn only the kind of outcome**: removed, acted on, or no breach. Never a warning, suspension or ban on someone else.
- **Decision emails are sent from the moderator's browser** through a Pages Function with their own token, because Cloudflare Pages has no scheduler. The queue's button catches any that failed.
- **Escalation after 15 minutes** (the story's proposal), as a setting (`on_call_escalation_minutes`). The phone alert and the escalation are logging stubs until a paging service is chosen.
- **Emergency disable doesn't ask for a fresh sign-in.** That comes with Google staff sign-in (S1-E2-07b, after March).
- **The evidence pack is a JSON download for March.** Keeping it in the private `evidence` bucket waits for SAFE-4's storage work.
- **Moving a case into safeguarding is one way.** Taking it out isn't offered, so a case can't slip back into the general queue by mistake.

<details><summary>New Romanian lines (for Robert to read)</summary>

My reports and decisions: "Raportările și deciziile mele" · "Ce s-a întâmplat cu raportările trimise de tine și deciziile echipei noastre despre postările tale. O persoană citește fiecare raportare." · "Decizii despre postările tale" · "Ți-am dat un avertisment" / "Ți-am suspendat contul" / "Ți-am închis contul" / "Am ascuns ceva ce ai postat" / "Am eliminat ceva ce ai postat" · "Este un avertisment pe contul tău. Nimic din ce ai postat nu s-a schimbat și poți posta în continuare." · "Contul tău poate doar citi până pe {{date}}. Până atunci nu poți posta, comenta sau trimite mesaje." · "De ce" · "Regula" · "Cum am aflat" · "Cineva a raportat-o sau a văzut-o echipa noastră. Un moderator a citit-o și a decis. Niciun instrument automat nu a luat această decizie." · "Poți contesta decizia până pe … (șase luni)." · "Scrie echipei de moderare și spune de ce decizia e greșită. Un alt moderator se va uita, unde se poate." · "Contestă decizia"

Notifications: "Vezi de ce" · "am verificat raportarea ta {{reference}} și am eliminat ce ai raportat." · "am verificat raportarea ta {{reference}} și am luat măsuri." · "am verificat raportarea ta {{reference}}. Nu încalcă regulile noastre sau legea, așa că am lăsat-o." · "un moderator ți-a trimis un avertisment."

Decision email: "Decizia noastră privind raportarea ta ({{reference}})" · "Am eliminat conținutul raportat de tine." · "Am luat măsuri privind conținutul raportat de tine." · "Am verificat conținutul raportat de tine și nu încalcă regulile noastre sau legea." · "O persoană din echipa noastră de moderare a decis pe … (ora României). Niciun sistem automat nu a luat decizia."

Staff, decisions: "Ce îi spunem persoanei (obligatoriu)" · "Intră în motivarea deciziei: ce s-a întâmplat și de ce, în cuvinte simple. Nu numi persoana care a raportat." · "Motivarea deciziei"

Staff, removal orders: "Ordin de eliminare" · "Legea UE ne dă o oră de la primire ca să eliminăm conținutul. Dezactivarea de urgență îl scoate peste tot deodată, îl păstrează șase luni pentru autorități și anunță autoritatea prin email." · "Dezactivare de urgență" · "Anunță autorul (debifează doar dacă ordinul cere asta)" · "Eliminat peste tot. Conținutul este păstrat șase luni, iar autoritatea este anunțată."

Staff, on call: "De gardă" · "Cine răspunde la un ordin de eliminare de la o autoritate. Cel de gardă primește primul alerta; dacă nimeni nu confirmă în 15 minute, o primesc toți cei cu permisiunea de gardă." · "Goluri în următoarele 14 zile" · "Adaugă o tură"

Staff, safeguarding: "Protecția copilului" · "Dacă o viață este în pericol, sună întâi la 112, apoi continuă aici." · "Contacte de sprijin pentru persoană ({{country}})" · "Telefonul copilului" · "Pachet de probe" · "Pregătește pachetul de probe" · "Sesizări către autorități" · "Mută la protecția copilului"

The rest are in `moderation.json` › `orders`, `safeguarding`, `onCall`, `decisionEmails` and `statements.json`.

</details>

## By hand

- **Staging top-up:** Supabase dashboard > staging project > SQL Editor > New query > paste `supabase/staging-topups/SAFE-3.sql` from main > Run, and expect the owner's 30-day shift in the last result.
- **Decision emails** use the `BREVO_API_KEY` already set for the Contact us and report forms (SAFE-1). Nothing new to add.
- **Before launch:** choose a paging service for the on-call alert (phone call or SMS). Today the alert and the escalation are only logged.

## Follow-ups

- S1-E10-07 appeals: replace "Challenge the decision" by Contact us with the appeal form and queue.
- A paging service for the on-call alert and the 15-minute escalation.
- The fresh sign-in before Emergency disable, with S1-E2-07b.
- Keep the evidence pack in the private `evidence` bucket once SAFE-4 adds storage.
- Move the decision email texts into the admin-editable templates with S1-E11-19.
- The order timeline and the case header should show times the same way (Romania time), and "Uploader told" should say "Not yet" before a decision.
- "Restrict" as a decision still waits for the story that defines it (S1-E11-08).

## For the lawyer

Seven points added to `docs/for-the-lawyer.md` under "Found while building SAFE-3":
- the content of the statements and the art. 19 small-enterprise exemption;
- telling reporters only the kind of outcome;
- which Romanian authority issues removal orders, and the 12-hour first-order notice;
- keeping removed content six months;
- telling the uploader;
- what may go into the evidence pack;
- the on-call rota as staff data.

Needs the lawyer's review before launch.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
