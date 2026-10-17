> Source: CTO pack, fact-checked 17 Oct 2026. The master plan's Decisions made tab wins if they differ.

#### S1-E10 Reporting, moderation and safety

**Back end and build order:** section 1.7, groups F (6.4, 6.5), G (7.3) and H (8.2 to 8.4), wave 3.

Goal: DSA notice and action, statements of reasons, the one-hour terrorist content rule and safeguarding for minors, run by a small team. Decided 16 Oct 2026: our own team moderates, in English and Romanian. Decided later that evening: moderation is in-house and acts on reports, with no outside moderation vendors and no hold before publishing (Q42, Q43); the only automatic check is the picture check on upload (S1-E10-05).

##### S1-E10-01 Report button on everything

As a user, I want to report any story, chapter, comment, profile, space, thread, post or message so that harmful content gets reviewed.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E1-02
- **Acceptance criteria:**
  - Given any user-content type, when it is shown, then it has a "Report" action reachable by keyboard and screen reader.
  - Given the report form, when it opens, then reasons include illegal content, harassment, self-harm, sexual content involving a minor, terrorism, hate, spam, copyright, "copied from a published work", undisclosed AI and other.
  - Given a report is sent, when it is received, then the reporter gets an on-screen and in-app confirmation.
  - Given a signed-in account that is still read-only (email, age check or parental consent pending), when it reports something, then the report is accepted; reporting is the one action the account gate always allows (section 1.7.8).
  - Given a new user-content type is added later, when its table is created, then CI fails unless it is registered with the reporting system.
  - Given the Report action in the app, when it opens, then it is the same report form as on the web (S1-E10-02), with the item filled in, so there is one form for every report.
- **Legal and compliance:** DSA Art 16 (notice and action, confirmation of receipt). Apple 1.2 and Google Play user-content policy.

##### S1-E10-02 One web form for all reports, including authority removal orders

As anyone, a member of the public, a rights holder or an authority, I want one web form to report content or send a removal order without signing up so that it reaches the right people fast.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E10-03, S1-E14-02
- **Updated:** 16 Oct 2026, late evening: one form for all reports and the TCO contact point (decided 22:59).
- **Acceptance criteria:**
  - Given the report form on the website (no account needed), when anyone opens it, then it takes every kind of report: illegal content, copyright, child safety, the other in-app reasons (S1-E10-01) and, through a separate "I'm a competent authority sending a removal order" path, authority removal orders.
  - Given a notice about illegal content, when it is submitted, then it requires the exact URL, an explanation of why the content is illegal, the notifier's name and email (optional for child sexual abuse reports) and a good-faith statement.
  - Given the form page, when it is shown, then it says plainly that it is our contact point for authorities and for removal orders under Regulation (EU) 2021/784, and that we accept reports and orders in English and Romanian.
  - Given an authority removal order is submitted, when it is saved, then it opens a tier-1 case (S1-E10-09), starts the one-hour clock and alerts the on-call founder at once (S1-E10-09); the authority gets an acknowledgement with the time of receipt.
  - Given any notice is received, when it is saved, then the notifier gets an acknowledgement email and later the decision.
  - Given the form, when bots are kept out, then the check is accessible (no puzzle only) and never blocks an authority's order.
- **Legal and compliance:** DSA Art 11, 12 and 16(2) to (5) (paragraph numbers to verify; research A2 confirms Art 16's content); Regulation (EU) 2021/784, art. 15(1) (contact point for removal orders) and art. 15(2) (accepted languages). Orders arrive here from a competent authority, never through user reports (decided 16 Oct 2026, late evening). Which Romanian authority issues orders and whether a web form alone satisfies the contact point duty are on the lawyer's list (section 6); proposal: also list a monitored email address on the contact page (S1-E14-02). Retention (decided 17 Oct 2026, Robert, canvas comment): a reporter's name, email and the report are kept for 3 years after the report is closed, then deleted; 3 years matches the general limitation period in the Romanian Civil Code (art. 2517, to verify), so the record exists if a decision is challenged. Lawyer to confirm per market.

##### S1-E10-03 Moderation queue with priority tiers

As a moderator, I want one queue sorted by urgency so that the most serious reports are handled first.

- **Priority:** Must · **Size:** L (split: 03a one queue with tiers, deadlines and a decision with a note, M, in the March MVP; 03b grouping, claiming and visible timers, after March) · **Depends on:** S1-E10-01, S1-E2-07
- **Acceptance criteria:**
  - Given how cases start, when the queue fills, then every case comes from a report, an authority order or a flagged picture (S1-E10-05); there is no automated text screening (decided 16 Oct 2026, late evening, Q42 and Q43).
  - Given reports, when they enter the queue, then they are tiered: authority removal order (1 hour), child abuse material or threat to a minor or self-harm risk (same day), other illegal content (48 hours), everything else (7 days).
  - Given several reports on one item, when they arrive, then they are grouped into one case.
  - Given a case, when a moderator claims it, then others see it is claimed, and the SLA timer is visible.
  - Given a decision, when it is saved, then the moderator picks an action (no action, remove, restrict, warn, suspend, ban) and must write a note.
- **Legal and compliance:** tiers follow the recommendation for Q62 (organisation answers: Robert said about 48 hours, or the statutory time where it differs); the 1-hour, same-day, 48-hour and 7-day tiers are shown on canvas 8.7 and, apart from the one-hour legal rule, are proposals. DSA Art 16(6) (paragraph to verify) asks for timely, diligent and objective handling.

##### S1-E10-04 Statements of reasons

As a user whose content was removed, I want to know what was done and why so that I can understand or challenge it.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E10-03, S1-E7-01
- **Acceptance criteria:**
  - Given a removal, restriction, suspension or ban, when it is applied, then the user receives a statement in their language with the action, the facts, whether automated means were used, the rule or law relied on and how to appeal.
  - Given the notifier of the case, when the decision is made, then they are told the outcome.
  - Given any statement, when it is sent, then a copy is stored with the case.
- **Legal and compliance:** DSA Art 17 and Art 16(5).

##### S1-E10-05 Picture check on upload

As a moderator, I want every uploaded picture checked automatically the moment it is uploaded so that nude, gory or known child abuse images never reach readers.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E10-03
- **Updated:** 16 Oct 2026, late evening (decided 22:59): picture uploads on from launch; Sightengine and Arachnid Shield; no text screening (Q42).
- **Acceptance criteria:**
  - Given any uploaded picture (cover, avatar, chapter picture, drawing, quote card background, space banner), when it is saved, then before anyone else can see it it goes to Sightengine (nudity, gore) and Arachnid Shield (hash matching against known child sexual abuse images). Teachers' proof files are excluded: only staff see them (S1-E2-11).
  - Given both checks pass, when the result returns, then the picture shows straight away.
  - Given either check flags the picture, when the result returns, then it stays private, readers see "Picture being checked", the uploader is told it is waiting for a person, and a case opens in the queue for an in-house moderator, who decides; the tools only hold, they never approve or remove on their own.
  - Given an Arachnid Shield match, when it is flagged, then the case is tier 2 (same day), the file is kept in the private evidence bucket and the safeguarding and reporting steps in S1-E10-10 apply.
  - Given a check service is down, when a picture is uploaded, then it stays private until the check runs; the writer can still save and publish the text around it.
  - Given text, when it is saved or published, then no automated check runs (decided 16 Oct 2026, late evening, Q42 and Q43).
- **Legal and compliance:** both services are new processors: data processing agreements, entries in the record of processing, the privacy notice and the DPIA, and a transfer check for each (Arachnid Shield is run by the Canadian Centre for Child Protection, check before relying on it; confirm where Sightengine processes images). Arachnid Shield has its own eligibility rules; apply early. What we must do with a confirmed match (preserve, report, to whom) and the UK Online Safety Act expectations on hash matching are on the lawyer's list (section 6).

##### S1-E10-06 Sanctions and repeat offenders

As a moderator, I want to warn, suspend or ban accounts so that repeat abusers are removed.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E10-03
- **Acceptance criteria:**
  - Given a sanction, when it is applied, then a suspended user can sign in, read and download their data but not post, comment or message until it ends.
  - Given a banned email address, when someone signs up with it again, then sign-up is refused.
  - Given a user whose reports are repeatedly unfounded, when a moderator flags this, then their ability to report can be paused for a set period (Q83).
- **Legal and compliance:** DSA Art 23 as good practice (micro and small platforms are exempt).

##### S1-E10-07 Appeals

As a user, I want to appeal a moderation decision so that mistakes can be fixed.

- **Priority:** Should · **Size:** M · **Depends on:** S1-E10-04
- **Acceptance criteria:**
  - Given a statement of reasons, when the user taps "Appeal" within six months, then they can explain why the decision is wrong.
  - Given an appeal, when it is reviewed, then a different moderator decides where possible and the user gets the outcome.
- **Legal and compliance:** DSA Art 20 internal complaints apply to platforms above micro and small size; building it now prepares for growth and for app store reviewers.

##### S1-E10-08 "Copied from a published work" report

As a reader, I want to report a story that copies a published book so that writers' work is respected.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E10-01, S1-E10-03
- **Acceptance criteria:**
  - Given the report form with this reason, when a reader submits it, then the source fields (title, author, ISBN or URL, matching passage) are all optional, the passage the reader selected is attached automatically, and the box says even just a title helps (Robert, canvas comment, 16 Oct 2026).
  - Given a report too thin to check, when a moderator opens it, then they can ask the reporter for more details from the case.
  - Given the case, when a moderator opens it, then they see the reported passage and the pasted source side by side.
  - Given the copy is confirmed, when the moderator decides, then a public note appears on the story (or it is removed); before confirmation nothing public changes.
- **Legal and compliance:** decided: uploads are not plagiarism-scanned; scanning applies only to works the imprint acquires (Stage 5). No similarity percentage is a legal safe harbour; even short original extracts can infringe (Infopaq).

##### S1-E10-09 Terrorist content removal orders

As the on-call person, I want to act on an official removal order within one hour so that the company meets EU law.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E10-03, S1-E14-02
- **Acceptance criteria:**
  - Given an order arrives through the report form's authority path (S1-E10-02) or is logged by staff from the contact page's email address, when it is saved, then the on-call founder gets an urgent phone alert within five minutes (proposal).
  - Given the on-call rota, when staff set it, then exactly one member of the founding team is on call at any time with the on-call permission; if the alert is not acknowledged within 15 minutes, the rest of the founding team is alerted too (proposal).
  - Given the order, when the on-call person uses "Emergency disable", then the content is unavailable everywhere in one action.
  - Given removal, when it is complete, then the content and related data are preserved for six months (canvas 8.4) and every timestamp is logged as proof.
  - Given the order allows it, when content is removed, then the uploader is told.
- **Legal and compliance:** Regulation (EU) 2021/784 (TCO), checked on EUR-Lex 16 Oct 2026: removal within one hour of receiving an order (art. 3(3)), for every hosting provider offering services in the EU (art. 1(2)), with 12 hours' notice before a provider's first order (art. 3(2), to verify: not in the research files or the 16 Oct EUR-Lex note); a contact point (art. 15(1)). Decided 16 Oct 2026, late evening: mandatory, the founding team rotates on call, and orders arrive at our published contact point, not through user reports. Which Romanian authority issues orders is on the lawyer's list (section 6).

##### S1-E10-10 Safeguarding escalation

As a community manager, I want a clear path for a young user in danger so that we act fast and correctly.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E10-03
- **Acceptance criteria:**
  - Given a case tagged self-harm, grooming or threat to a minor, when it opens, then the moderator sees a safeguarding checklist and support resources, including the child helpline for the person's country (Romania: 116 111, Monday to Friday 10:00 to 20:00, research G4; see S1-E10-13).
  - Given a credible threat to life or safety, when the moderator escalates, then the system produces an evidence pack (content, account data, timestamps) for police or prosecutors and logs the referral.
  - Given a safeguarding case, when it is handled, then only safeguarding-trained staff can see it.
- **Legal and compliance:** DSA Art 18 (notify authorities of suspected criminal offences involving a threat to life or safety) and Romanian Law 50/2024 art 31 (to verify). The written safeguarding process (risk table) must exist before launch.

##### S1-E10-11 Moderator mail

As a user, I want to write to the moderation team so that I can raise problems or ask about a decision.

- **Priority:** Should · **Size:** M · **Depends on:** S1-E10-03
- **Acceptance criteria:**
  - Given "Contact moderators", when a user writes, then the message goes to a shared inbox, not to any one moderator (proposal: the same ready-made helpdesk as S1-E14-04, in its own queue).
  - Given a thread in the shared inbox, when staff handle it, then they can assign it, add internal notes and reply as "The moderation team".
- **Legal and compliance:** supports the DSA Art 12 user contact point.

##### S1-E10-12 Spam and abuse rate limits

As a user, I want spam kept out so that forums and comments stay useful.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E2-01, S1-E11-03 (the limits screen; seeded defaults until then)
- **Acceptance criteria:**
  - Given an account less than 24 hours old, when it posts, then it can include at most one link per post and posts at a lower rate.
  - Given sign-up, when bot-like behaviour is detected, then an accessible challenge is shown that does not rely on a puzzle only (proposal on canvas 8.6: a code sent by email).
  - Given any rate limit, when it is hit, then the user sees how long to wait.
  - Given the limits, when an admin changes them in Settings (S1-E11-03), then the new numbers apply within a minute and the change is logged.
- **Legal and compliance:** WCAG 2.2 criterion 3.3.8. Rate limits and IP use must appear in the privacy notice; IP addresses are scrambled and kept 30 days (Q48). There is no extra limit on new chats for new accounts (Q61).

---

##### S1-E10-13 Country-specific emergency and safety contacts

As a person who sees that someone is in danger, I want the emergency number, children's helpline and abuse-reporting links for my own country so that I contact the right people straight away.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E2-10 (country from the connection), S1-E10-02 (the report form), S1-E11-13 (support tickets), S1-E11-01; back end: a `safety_contacts` table (country, kind, label, number, link, language, last checked, checked by) and a monthly scheduled job
- **Added:** 17 Oct 2026, Robert (canvas comment on 7.3 Report without an account): adjust to the account's country, give the specific link for each country, and create a task for the support team every month to check the numbers are up to date. Research: G4 (safety contacts by country, checked 17 Oct 2026): all 8 launch countries, official sources (which countries open at launch is OPEN, section 1.2). Watch items for the monthly check: Telefonul Copilului now Monday to Friday 10:00 to 20:00, no confirmed youth crisis line in Romania (the ARPS line is for adults, weekends overnight), Papyrus HOPELINE247 closed (UK), Singapore police SMS is 70999, Tinkle Friend (SG) covers only ages 13 and under, Canada's Digital Safety Commission bill is not law.
- **Acceptance criteria:**
  - Given a signed-in user, when the report form, the Report without an account page, the safety help page or a safeguarding message shows "If someone is in danger", then it shows the contacts for the account's country (from the connection at sign-up): the emergency number, the children's helpline, where to report child sexual abuse material and, where one exists, a crisis line for young people, each with its official link.
  - Given a signed-out visitor, when the same block shows, then it uses the country of their connection, and offers "Not your country?" with a list of every launch country.
  - Given a country with no row yet, when the block shows, then it shows "Call your local emergency number" and the international links we keep for that case, and the gap is logged for staff.
  - Given each contact, when it is shown, then the number is a tappable phone link on phones and plain selectable text everywhere, and the link opens the official site in a new tab.
  - Given the admin site, when staff open Settings › Safety contacts, then they can edit each country's contacts in both languages, and every change records who changed it and when.
  - Given the first day of each month, when the scheduled job runs, then it creates one support ticket per launch country, assigned to the support team, titled "Monthly check: safety contacts for <country>", listing each contact with its link and the date last checked; the ticket closes only when staff confirm each contact or record a change.
  - Given a contact not confirmed for 45 days (proposal), when the admin site loads, then the owner sees a warning until it is checked.
- **Legal and compliance:** DSA art. 16 and 28 (easy reporting and protection of minors); TCO art. 15 contact point stays the report form. Numbers are safety-critical: never shown from memory or an unchecked source; the source link and check date are stored with each contact. No tracking on outbound links to helplines.

---
