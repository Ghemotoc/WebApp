> Source: CTO pack, fact-checked 17 Oct 2026. The master plan's Decisions made tab wins if they differ.

#### S1-E11 Admin site

**Back end and build order:** section 1.7, group H (screens 8.1 to 8.12 and the website CMS), waves 3 and 5; how the admin site and CMS work is in section 1.8.

Plain components are fine here (design direction).

##### S1-E11-01 Admin shell with protected access

As staff, I want an admin site that only verified staff can reach so that powerful tools stay safe.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E2-07, S1-E1-02 (audit log)
- **Updated:** 16 Oct 2026 (late evening): navigation, sensitive reads and staff sessions (section 1.8).
- **Acceptance criteria:**
  - Given a user without a staff role or without a staff session from the company's Google Workspace sign-in on themagiccoffin.com (`is_staff_session()`, S1-E2-07; in March any staff-role session, S1-E2-07a), when they open any admin route, then they are refused by the server, not only hidden in the interface.
  - Given any admin action, when it is performed, then the audit log stores who, what, when and the before and after values.
  - Given a sensitive read (revealing an email, opening a draft, an export file, an evidence pack or a teacher's proof), when it happens, then it is logged too.
  - Given the audit log, when anyone tries to change or delete a row, then the database refuses, the owner included; admins and the owner can search it and export it as CSV.
  - Given a staff session, when 12 hours have passed (proposal), then the person signs in again; changing a role, starting an export for someone else, "Emergency disable" and removing part of a writer's text ask the person to sign in with Google again (a fresh sign-in, proposal; no separate code, decided 17 Oct 2026, 11:53; section 1.8.3).
  - Given the menu, when a staff member opens the admin site, then it shows only the areas their role allows (section 1.8.2); the server still checks every action.
- **Legal and compliance:** GDPR Art 32 and accountability (Art 5(2)).

##### S1-E11-01b Pick the account when granting a role

As an owner or admin, I want to grant a role by picking an account that already exists so that I never have to know or type its username.

- **Priority:** Must · **Size:** S · **Depends on:** S1-E11-01, S1-E2-07a
- **Added:** 24 Oct 2026, Robert's request after testing /staff/roles on staging (he typed an email and got one combined error), written up by the CTO.
- **Acceptance criteria:**
  - Given /staff/roles, when the owner or an admin types in the search box, then it finds existing accounts by username, pen name or email; an email matches only whole (decided 24 Oct 2026, so the search can't fish for addresses) and shows masked (r***@gmail.com); revealing it stays a logged sensitive read.
  - Given the results, when the staff member picks one, then they choose the role and write the reason, and the grant uses that account.
  - Given a refused change, when the page explains it, then the message names the actual problem (no such account, reason missing, last owner, not a staff account, and the other rules) instead of one combined sentence.
  - Given the owner-only and audit-log rules, when anything here runs, then they are unchanged.
  - The last-owner guard has a database test that calls it directly with the last owner as target, because no screen can reach it (decided 24 Oct 2026).
- **Legal and compliance:** data access on a need-to-know basis (GDPR Art 5(1)(f)); revealing an email is logged (section 1.8.3).

##### S1-E11-02 User management

As a moderator, I want to look up accounts and act on them so that I can enforce the rules.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E11-01, S1-E10-06
- **Acceptance criteria:**
  - Given a search by handle, email or user ID, when results show, then staff see account status, the age check result and its date, sanctions history and open cases; the account page shows the user ID in short form with a copy button.
  - Given an account, when staff act, then they can suspend, ban, reset a pen name, sign the user out everywhere or start a data export or deletion on the user's request (once S1-E11-09 exists, these open a request in Data requests so the deadline and identity check are tracked).
  - Given an account, when staff view it, then private messages are visible only if they are part of a report.
- **Legal and compliance:** data access on a need-to-know basis (GDPR Art 5(1)(f)).

##### S1-E11-03 Content settings and feature flags

As an admin, I want to manage categories, forums, reserved names and feature flags so that I can change the platform without new code.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E11-01
- **Acceptance criteria:**
  - Given admin, when an admin edits categories, forums, reserved names, ranking weights, rate limits or maintenance mode, then the change applies within a minute and is logged.
  - Given feature flags and settings, when they are listed, then they include parental consent (on; an emergency switch only), picture uploads (on), images in posts, the teaser length, social log-in (S1-E2-09), the number of confirmed AI reports before a label (S1-E3-06), the Discover mix (S1-E5-03) and the username word lists (S1-E2-04).
- **Legal and compliance:** lets OPEN decisions land without a release.

##### S1-E11-04 Metrics and compliance logs

As the founder, I want a dashboard of key numbers and a log of legal requests so that I can run the March test and prove compliance.

- **Priority:** Should · **Size:** M · **Depends on:** S1-E15-02, S1-E10-03
- **Acceptance criteria:**
  - Given the dashboard, when it opens, then it shows sign-ups by age (13 to 15, 16 to 17 and 18 or over, counted from year of birth), age checks passed, failed and appealed, writers who published, readers, the March return rate, reports by tier and the share handled within SLA.
  - Given an authority order or legal request, when it is logged, then it records the authority, date, content, action taken and timestamps.
- **Legal and compliance:** transparency reports are not required for micro and small enterprises (DSA Art 15(2)), but this data will be needed as the platform grows. ANCOM must be notified within 45 days of launch (Law 50/2024); track it here as a launch task.


##### S1-E11-05 Markets and languages

As the founder, I want to open a language and a country only when we can moderate it so that every open market is safe and lawful.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E11-03, S1-E2-10
- **Updated:** 17 Oct 2026, 19:14: stays after March. The website CMS (S1-E11-06, in the March MVP) reads the markets list seeded by migration until this screen lands; when a market opens here, the CMS offers it with its languages.
- **Added:** 16 Oct 2026, Robert's decision (chat): launch in English and Romanian, for English-speaking countries and Romania. Updated 17 Oct 2026, 11:48: Romania opens first; English-speaking countries open later, one by one, each after its legal check (replaces "all at the same time", 16 Oct evening). At launch only Romania is Open; the others show Ready to open or Closed.
- **Acceptance criteria:**
  - Given admin settings, when staff look at Markets and languages, then each language (English, Română to start) and each market (UK, Ireland, US, Canada, Australia, New Zealand, Singapore, Romania, others) shows Open, Ready to open or Closed.
  - Given a language with no moderator who reads it on the rota, when staff try to open it, then it is blocked.
  - Given a market whose legal check is not done, when staff try to open it, then it is blocked.
  - Given Australia, when staff look at it, then it is open to people 16 and over only and closed to under-16s until a lawyer says otherwise (decided 16 Oct 2026, late evening, Q19; S1-E2-10).
  - Given story creation, when a writer picks the story language, then only open languages can be chosen; others show "Coming when we have moderators for it".
  - Given the interface, when a user picks a language, then English and Română are available.
- **Legal and compliance:** each market has its own child-safety law (research H1, 16 Oct 2026): for example the UK Online Safety Act (children's risk assessment and highly effective age assurance), Australia's under-16 social media minimum age (in force since 10 Dec 2025), US COPPA and state laws, and Ireland's GDPR consent age of 16. The legal check per market comes before opening it, so if every English-speaking market opens alongside Romania (OPEN, see above), each of those checks has to be done before the March test. Australia: closed to under-16s until a lawyer says otherwise (Q19); whether the law applies to Ghemotoc at all is on the lawyer's list (section 6).

##### S1-E11-06 Website CMS and home page copy

As an admin, I want to edit the public website's pages, starting with the home page, for each market and language from the admin site so that we can refresh the message without a new release and without an engineer.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E11-01, S1-E2-07a, S1-E1-04; markets come from the markets list (seeded by migration for March; the admin screen for markets is S1-E11-05, after March); back end: the CMS tables in the app's database behind the `WebsiteContentStore` contract (sections 1.6 and 1.8.6; B31 in section 1.7)
- **Updated:** 17 Oct 2026, 19:14 to 19:19 (Robert): retitled from "Website home page copy" and moved into the March MVP as Must. It builds the shared CMS core that S1-E11-10, S1-E11-12 and S1-E11-18 reuse. Website pages get their text only from the CMS, never from the locale files (replaces the 12:34 rule for the March home page copy; the page itself still lives inside the web app). Staff pick the market and the language of the page they edit, and every market can have its own home page in each of its languages (19:14). A visitor from a country with no page of its own sees the Romanian market's English page (19:16). Until the website database exists (set-up OPEN), the content is stored in the app's database behind one store interface (19:16). Only the admin role and the owner edit and publish (19:19).
- **Updated:** 16 Oct 2026 (late evening): today's live copy, roles.
- **Added:** 16 Oct 2026, Robert's comment (canvas, 1.1 Website home page hero).
- **Acceptance criteria:**
  - Given the CMS core, when any page is stored, then it is identified by page, market and language, and every edit is a version with a status: draft, scheduled (published with a future "show from" date) or published; only one published version per page, market and language is live at a time.
  - Given Website › Home page, when an admin opens it, then they first pick the market (from the markets list, seeded by migration for March) and one of that market's languages; each market can have its own home page in each of its languages (decided 17 Oct 2026, 19:14).
  - Given the home page editor, when an admin opens a market and language, then they can edit the line above the headline, the headline on two lines, which headline word gets the gold underline, the line under the headline, the two button labels and the three short points. Version 1 of the Romanian market's page in Română and English is seeded with the copy that is live now (the headline is "Write stories. Get read." and the line under it is "Post your stories, poems and essays, one chapter at a time, and find the people who want to read them.", decided 16 Oct 2026, late evening).
  - Given any edit, when an admin types, then a live preview shows the hero text in the website's fonts and colours (text only, no drawings or images).
  - Given the character limits (proposal: line above the headline 50, headline 40 across both lines, line under it 170, each button 20, each point 30), when a required field is empty or a field is over its limit, then its counter turns red, the field is marked invalid for screen readers and Publish is refused with the list of fields to fix.
  - Given a "show from" date, when an admin publishes, then the new version goes live at 00:00 Romanian time on that date (or within a minute if the date is today) and the current version stays up until then; Save draft keeps the work without changing the website.
  - Given Earlier versions, when an admin presses Restore on one, then its copy comes back into the editor as a draft for the same page, market and language and goes live only when it is published again.
  - Given a publish, a restore or a scheduled version going live, when it is saved, then the audit log stores who, when, the page, market and language, the go-live date and the before and after copy (S1-E11-01).
  - Given staff with the admin role or the owner, when they save or publish, then it works; anyone else, a content editor without the admin role included, is refused by the server, not only hidden in the menu (decided 17 Oct 2026, 19:19; section 1.8.3).
  - Given the public home page, when it loads, then it reads the published version for the visitor's market (the country from the connection, S1-E2-10) and language; a visitor from a country with no page of its own sees the Romanian market's English page (decided 17 Oct 2026, 19:16); if the market has no page in the chosen language, the market's first language shows (proposal). It never reads a draft or scheduled version, and if a read fails it shows the last published version it has instead of an empty hero.
  - Given the storage, when the CMS saves or reads, then it goes through the `WebsiteContentStore` contract to tables in the app's database (decided 17 Oct 2026, 19:16); the editors and the public page use only the contract, so moving to the website database later (set-up OPEN) swaps the storage, not the editors, and a contract test runs against the app-database store.
  - Given the home page, when it is built, then none of its page text comes from the locale files (decided 17 Oct 2026, 19:14); the copy that was in them for the March plan is seeded as version 1 instead.
- **Legal and compliance:** consumer law: the copy must not mislead (Law 363/2007 on unfair commercial practices, from Directive 2005/29/EC). Claims such as "free", "no tracking ads" and "you keep your rights" must stay true for as long as they are live, so check them against the current terms and any paid plans before publishing; calling something "free" when users have to pay is on the always-unfair list (Annex I, point 20, to verify). Each market's page must pass that market's legal check before that market opens (decided 17 Oct 2026, 11:48: every market opens only after its legal check; S1-E11-05). Accessibility: the headline stays the page's one `h1`, the gold underline is decoration only and the `lang` attribute matches the copy's language (WCAG 2.2, 1.3.1 and 3.1.1). Four eyes (decided 16 Oct 2026, late evening, Q31): home page copy is logged only; other people review copy before it goes live, outside the tool; only the admin role publishes (decided 17 Oct 2026, 19:19).

##### S1-E11-07 Every story in the admin site

As a moderator or support person, I want to find any story by title, handle or user ID so that I can act on reports and data requests quickly.

- **Priority:** Should · **Size:** M · **Depends on:** S1-E11-01, S1-E2-07, S1-E3-01, S1-E10-03 (open report counts); back end: section 1.7, group H (8.10)
- **Added:** 16 Oct 2026 (late evening), Robert's request (chat): "the admin panel should also have an option to access every story". Canvas 8.10.
- **Acceptance criteria:**
  - Given Stories in the admin site, when staff search, then they can search by title, by current or earlier handle (earlier handles come from the audit log) or by user ID, full or in its short form.
  - Given the search, when staff filter, then they can filter by category, language, status (draft, published, hidden, removed), where it can be read, rating, open reports and writers under 18.
  - Given the results, when they are shown, then each row has the title, the owner's handle, the owner's user ID in short form with a copy button, category, language, status, where it can be read, rating, chapter count, last update and open reports. It never shows year of birth, email or chapter text.
  - Given a draft story, when it appears in the results, then only its title and metadata show; its text opens only from a case or a data request, and opening it is logged with the reason (proposal).
  - Given the list, when staff look for bulk actions, then there are none: every change is made on one story in S1-E11-08.
  - Given a support person, when they open a story, then they see its metadata but not the change controls; given a content editor, when they open Stories, then the server refuses. Stories › Classics is for the admin role only; content editors who work on Classics also hold the admin role (decided 17 Oct 2026, 12:44).
- **Legal and compliance:** need-to-know access (GDPR Art 5(1)(f) and Art 32). A writer's unpublished drafts are their personal data and unpublished work, so reading them needs a reason that is logged. Searching by user ID uses the index on each story's `user_id`.

##### S1-E11-08 Staff can open and change any story

As a moderator or admin, I want to open any story and change its settings, visibility and metadata, or remove an unlawful part, so that I can fix a problem without deleting a writer's whole work.

- **Priority:** Should · **Size:** L (split before building: 08a open a story, settings, visibility and metadata with a reason and a notice; 08b version history, restore and removing a passage) · **Depends on:** S1-E11-07, S1-E3-04, S1-E3-05, S1-E3-06, S1-E10-04, S1-E7-01, S1-E14-01; back end: section 1.7, group H (8.11)
- **Added:** 16 Oct 2026 (late evening), Robert's request (chat): "access every story and make any changes there". Canvas 8.11. Decided later that evening (Q14): staff may hide or restrict a story, fix its settings and details and remove unlawful parts; they cannot edit words.
- **Acceptance criteria:**
  - Given a story opened from Stories or from a case, when it loads, then staff see its cover, title, blurb, the owner's handle and user ID, all its settings (status, where it can be read, comments, rating, content labels, category, tags, language), each chapter with its status and the story's version history.
  - Given staff change visibility (hide or restrict the story or one chapter), settings or metadata, when they save, then they must give a reason (a list plus free text) and the change applies within a minute.
  - Given a change that removes or restricts content (hiding, restricting, removing a passage, raising the rating), when it is saved, then the writer gets a statement of reasons (S1-E10-04) saying what changed, why, the rule or law relied on and how to appeal (S1-E10-07).
  - Given a change that doesn't restrict anything (for example a corrected category or tag), when it is saved, then the writer gets a notification saying what changed and why.
  - Given an unlawful passage or someone's personal data in a chapter, when staff remove it, then they select the exact passage and it is replaced with "[Removed by the moderation team]"; the rest of the chapter is untouched.
  - Given a removed passage, when it is stored, then the original stays in the version history, visible only to staff working on that case, until the case's retention period ends.
  - Given the chapter text in the admin site, when staff try to type in it, then they can't: staff can remove a marked passage but never add to or reword the writer's text.
  - Given a writer asks staff to change their words for them, when staff answer, then they explain that only the writer can edit their text; staff never type in a writer's text, even on request (decided 16 Oct 2026, late evening, Q14).
  - Given a title or cover that breaks the rules, when staff act, then they can hide the cover (the automatic cover from S1-E3-13 shows instead) or hide the title on public screens behind "Title hidden by the moderation team" until the writer changes it; staff never write a new title.
  - Given any change, when it is saved, then a new version is stored with who, when, the reason and the before and after; the audit log gets an entry that carries the owner's user ID.
  - Given the version history, when staff press Restore on an earlier version, then that version's settings and text come back as a new version with its own reason, and the writer is told.
  - Given a story by a writer under 18, when it is opened, then the page shows "under 18" (age group only) and the same rules apply.
  - Given a support person or a content editor, when they try any change, then the server refuses it.
- **Legal and compliance:**
  - Decided (Q14): staff can hide or restrict a story, change its settings and visibility, fix its metadata and remove unlawful parts or personal data; they never edit words. Each change needs a logged reason and a notice to the writer; when content is restricted or removed, that notice is a DSA art. 17 statement of reasons, which applies to every hosting provider. Every change is versioned, restorable and in the audit log.
  - Why: Law 8/1996 gives the author the right to have the integrity of the work respected (art. 10(d), letter to verify; research A3 confirms art. 10), and moral rights can't be waived or transferred (art. 11(1)). Our terms (S1-E14-01) give Ghemotoc a licence to host and display, not to edit. Whether cutting an unlawful passage with a visible marker is safe under art. 10(d) is on the lawyer's list (section 6).
  - Removing one passage instead of the whole story is the proportionate option, in line with DSA art. 14(4) (diligent, objective and proportionate enforcement).
  - The terms must list what staff can change (S1-E14-01). An avocat checks the policy before launch.
  - OPEN: how long the original of a removed passage is kept. Proposal: with the case, for the case's retention period, then deleted.

##### S1-E11-09 Data requests and story export

As a support person, I want to find a user, log their data request and send them every story they wrote, plus a machine-readable copy of their data, so that we answer correctly and within the legal deadline.

- **Priority:** Must (GDPR) · **Size:** L (split before building: 09a the request log, identity check, deadline, the machine-readable copy and the Word files; 09b the PDF files; both after March since 17 Oct 2026, 12:44) · **Depends on:** S1-E11-01, S1-E11-02, S1-E13-02, S1-E2-07, S1-E7-01; S1-E2-03 for requests made by a parent; back end: section 1.7, B28
- **Updated:** 17 Oct 2026, 12:44 (Robert): after March. The March test is invited adults only and data requests arrive by email and are answered by hand; this story comes before going live. Priority unchanged.
- **Added:** 16 Oct 2026 (late evening), Robert's request (chat): "download as Doc or PDF every single story when a user wants to have a data request". Canvas 8.12.
- **Acceptance criteria:**
  - Given Data requests, when staff open a new request, then they find the user by user ID, handle or email and record the type (a copy of my data, move my data, correct, delete, other), how it arrived (in the app, by email, by post) and the date it was received.
  - Given a new request, when it is saved, then the deadline (one month from receipt) is calculated and shown, with a reminder 7 days before and an alert 2 days before (proposal).
  - Given a request that needs more time, when staff extend it, then they can add up to two more months with a reason, and the user is told within the first month.
  - Given a request that did not come from inside the signed-in account, when staff process it, then the person's identity is checked before anything is sent (a confirmation link to the account's email address or a sign-in to the account), the method and result are logged and nothing is ever sent to any other address.
  - Given a request about a user under 16 by year of birth that comes from anyone other than the signed-in account, when staff process it, then it goes through the parent or guardian recorded in the parental consent (S1-E2-03), checked the same way.
  - Given an export starts, when the job runs, then it finds every story by the owner's user ID, so stories published under an earlier handle or pen name are included, along with drafts and unpublished chapters.
  - Given each story, when the files are made, then there is one Word (.docx) file per story from the first version (09a; decided 16 Oct 2026, late evening, Q28 and Q29: writers may want to edit it or send it to an agent) and, once 09b lands, one .pdf, each with the title, the pen name, the user ID, the dates created, first published and last updated, the status and every chapter in order with its title and dates.
  - Given the Word and PDF files, when they are opened, then Romanian letters (ă, â, î, ș, ț) show correctly, headings are real headings so screen readers can use them, pictures in chapters are included with their alt text and music or video embeds are listed as links.
  - Given the machine-readable copy, when it is built (09a), then it reuses the S1-E13-02 export: one ZIP with the JSON file of everything the user put on Ghemotoc plus their account data, including the user ID, and the Word file for each story made by the shared Word builder that S1-E13-02 builds (decided 17 Oct 2026, 12:34); no HTML copy and no EPUB (decided 16 Oct 2026, late evening, Q28).
  - Given the files are ready, when staff choose, then they can send one file per story or one zip of all; the user gets a link that needs sign-in (or, for a parent, a one-time link to the checked email address) and expires after seven days.
  - Given the files, when staff look at the request, then they see the file names and sizes; opening a file's contents is possible but logged, because staff don't need to read them.
  - Given a request is closed, when it is stored, then the log keeps the user ID, the type, the dates, the identity check, which files were sent and who handled it, but not the files; export files are deleted after seven days (S1-E13-04).
  - Given a moderator or a content editor, when they open Data requests, then the server refuses; support, admins and the owner can use it.
- **Legal and compliance:**
  - GDPR articles 12(3), 12(6) and 15(3) below are not in the research files (to verify against the regulation's text). GDPR Art 15 (a copy of the data, in a commonly used electronic form when the request was made electronically, Art 15(3)), Art 20 (portability: structured, commonly used and machine-readable), Art 12(3) (one month, extendable by two further months with notice within the first month), Art 12(6) (identity check) and Art 5(2) (the log is our proof).
  - GDPR requires the machine-readable copy, not Word or PDF; the Word files are a service on top. Decided (Q29): 09a and Word were in the March MVP, about 30 hours; both moved after March on 17 Oct 2026, 12:44 (invited adults only, requests by email) (12 for the request log and deadline, 18 for Word); PDF after March. The Word builder itself is built in S1-E13-02, which comes first in the build order, and 09a reuses it (decided 17 Oct 2026, 12:34), so the 18 hours of Word work sit in S1-E13-02.
  - Under-16s, decided (Q27): a 13 to 15-year-old can download their own data from their own signed-in account; requests made on a child's behalf go through the parent or guardian checked against the consent record (S1-E2-03). Minors' legal capacity follows the Civil Code (art. 41 for 14 to 17-year-olds); an avocat confirms (section 6).
  - Tools: recommendation (Q49, pending): the `docx` npm library in an edge function for Word; the PDF tool is OPEN (question 34f). A library inside the edge function is simplest, while an HTML-to-PDF renderer gives tagged, accessible PDFs. A hosted renderer would be a new processor and needs a data processing agreement.
  - Large exports run as a job per story and are zipped at the end, so edge function time limits are never hit.

##### S1-E11-10 Website notice banners

As an admin, I want to put a short notice at the top of the website and the app (for example news about a new feature) so that visitors see news without a new release.

- **Priority:** Should · **Size:** S · **Depends on:** S1-E11-06 (the shared CMS core); back end: one notice table that the website and the app both read, in the app's database behind the `WebsiteContentStore` contract until the website database exists (decided 17 Oct 2026, 12:44 and 19:16; section 1.8.6, B31)
- **Updated:** 17 Oct 2026, 19:14 to 19:19 (Robert): in the March MVP, built on the CMS core from S1-E11-06; notices are per market and language; admin-only.
- **Added:** 16 Oct 2026 (late evening), Robert's request (chat): website CMS banners.
- **Acceptance criteria:**
  - Given Website › Notice banners, when an admin creates a notice, then they pick the market and enter the text in each of that market's languages (for Romania: Română and English; each up to 120 characters, proposal), an optional link to one of our own pages, a type (news, contest or important) and the pages it shows on (every page or the home page only).
  - Given a notice, when it is saved, then it has a "show from" date and an optional "show until" date, both at 00:00 Romanian time, and it can't be published unless every language of its market is filled in.
  - Given a published notice, when the website or the app loads, then both show it, read from the same table (decided 17 Oct 2026, 12:44), for the visitor's market and language with the same fallback as pages (the Romanian market's English notice for a country with no page of its own).
  - Given two notices for the same page, market and time, when the website or the app loads, then only one shows: the one with the latest "show from" date.
  - Given the type, when the notice is shown, then its colours come from the design tokens and meet 4.5:1 contrast; it doesn't move focus, doesn't animate and is a labelled region that screen readers can find.
  - Given a visitor closes a notice, when they keep browsing, then it stays closed for that visit only (session storage, so no consent is needed).
  - Given a publish or a change, when it is saved, then the audit log stores who, when, the market and language and the before and after; earlier versions can be restored as drafts.
  - Given anyone without the admin role (the owner excepted), when they try to save or publish a notice, then the server refuses (decided 17 Oct 2026, 19:19).
  - Given anything a sponsor pays for, when staff try to put it in a notice, then they can't: notices carry no sponsor names or logos, and paid content goes through Sponsors (S1-E12).
- **Legal and compliance:** keeping sponsors out of notices keeps ads labelled and in their own slot (DSA art. 26 as good practice). Claims in notices must be true (Law 363/2007).

##### S1-E11-11 Seasonal doodle schedule

As an admin, I want to plan which seasonal doodle shows on which dates so that Discover and Search change with the seasons without a new release.

- **Priority:** Could · **Size:** S · **Depends on:** S1-E11-01, S1-E2-07, the doodle set (canvas 11.1); back end: B30 in the app's database (section 1.7)
- **Added:** 16 Oct 2026 (late evening): the admin part of S1-E5-07, moved here so the website CMS tools sit together.
- **Updated:** 17 Oct 2026, 19:19: stays after March; like the rest of the CMS it is admin-only (content editors hold the admin role, decided 12:44).
- **Acceptance criteria:**
  - Given Website › Seasonal doodles, when an admin adds an occasion, then they set a name, a date range (with "every year"), the doodle and where it shows (the Discover greeting, the Search popular tags or both).
  - Given the doodle choice, when the admin picks one, then they choose only from the approved SVG doodles shipped with the app; new doodles arrive as SVG files in a normal release, never as uploads.
  - Given two occasions that overlap, when a date falls in both, then the shorter one wins; a season's default doodle covers days with no occasion.
  - Given the schedule, when it is shown, then a year view shows every occasion and any gaps, with a preview in light and night mode.
  - Given a change, when it is saved, then it applies within a minute with no release and is logged.
- **Legal and compliance:** keep occasions inclusive; staff choose and no religious or political occasion is on by default. OPEN (from S1-E5-07): whether occasions follow the reader's country, and whether the website shows them too.

##### S1-E11-12 Help pages and questions

As an admin, I want to write and update help pages and frequently asked questions for each market and language so that the website and the app answer common questions without a new release.

- **Priority:** Should · **Size:** M · **Depends on:** S1-E11-06 (the shared CMS core), S1-E1-04, S1-E14-01; back end: help and question tables in the app's database behind the `WebsiteContentStore` contract until the website database exists (decided 17 Oct 2026, 19:16; section 1.8.6, B31)
- **Updated:** 17 Oct 2026, 19:14 to 19:19 (Robert): in the March MVP, built on the CMS core from S1-E11-06; help pages and questions are per market and language; the home page's questions section reads them (its text comes only from the CMS); admin-only for all of it (replaces the proposal that only legal and safety answers need an admin).
- **Added:** 16 Oct 2026 (late evening), Robert's request (chat): website CMS help and FAQ pages.
- **Acceptance criteria:**
  - Given Website › Help and questions, when an admin writes a help page, then they pick the market and language, and the page has a title, a web address, a section and a body in the safe Markdown subset.
  - Given a question, when the admin writes it, then it has the market and language, the question, the answer, its order and where it shows (the website home page, the help centre or both).
  - Given the first version, when the CMS starts, then the questions live on the website on 16 Oct 2026 are seeded as version 1 for the Romanian market in Română and English, including "What is a class space?".
  - Given the home page's questions section (S1-E5-08), when it loads, then it reads the published questions marked for the home page for the visitor's market and language, with the same fallback as pages (the Romanian market's English page for a country with no page of its own).
  - Given an edit, when it is published, then it follows the CMS way of working: a preview, a "show from" date, every language of the market required, earlier versions with Restore and an entry in the audit log (section 1.8.6).
  - Given any help page or question, when someone saves or publishes it, then only staff with the admin role (and the owner) can; the server refuses everyone else (decided 17 Oct 2026, 19:19). Answers about age checks, parental consent, messaging rules, privacy, reporting or money are marked as legal wording and stay admin-only in any case.
  - Given a link inside a help page, when it is saved, then links to our own pages must work, or saving is refused with the broken link named.
  - Given the app, when a user opens Help, then it shows these same pages for their market and language.
  - Given any help page, when it is shown, then it has one `h1`, real headings and the right `lang`.
- **Legal and compliance:** if a help page and the terms or privacy notice disagree, the legal documents win and the help page is fixed the same day. Plain language a 13-year-old can follow (DSA art. 14(3)). Claims must be true (Law 363/2007): version 1 describes the public launch (the Yoti age check, parental consent for under-16s), so for the invited-adults March test (decided 17 Oct 2026, 12:44) an admin edits or holds back any answer that isn't true yet before the page goes public (docs/board-fixes.md).

---

##### S1-E11-13 Support tickets inside the admin site

As a staff member, I want every support request to arrive as a ticket in the admin site, linked to hello@themagiccoffin.com, so that we answer every person from one place with the user's account, reports and data requests beside the conversation.

- **Priority:** Must · **Size:** L (split before building: 13a inbox, ticket view and email in and out; 13b views, timers, canned replies, merge and reports) · **Depends on:** S1-E11-01, S1-E2-07, S1-E14-04, S1-E7-02 (email provider), S1-E10-02, S1-E11-09; back end: `tickets`, `ticket_messages`, `ticket_events`, an inbound-email webhook and an outbound mail sender (section 1.7)
- **Added:** 17 Oct 2026, Robert (chat). Slice: after March (proposal); for the March MVP, Contact us messages arrive at hello@themagiccoffin.com and staff answer from that mailbox. Robert's words: "I do want the ticketing system to be integrated in the admin portal where everything is available", linked to a general email address and following normal ticketing logic. Refines Q60. Engine decided 17 Oct 2026: a ready-made external helpdesk (EU data hosting, DPA) runs behind these screens through its API; email in and out, threading and spam filtering come from the helpdesk, and our admin site shows and answers every ticket. Which product is **OPEN** (cheapest suitable option, research pending).
- **Acceptance criteria:**
  - Given an email to hello@themagiccoffin.com, a Contact us form (S1-E14-04) or an in-app message, when it arrives, then a ticket is created with a number (#1042), subject, channel, the first message and, if the sender has an account, their user ID and username; an email from an unknown address creates a ticket marked "email only".
  - Given a new ticket, when it is created, then the sender gets an acknowledgement email from hello@themagiccoffin.com with the ticket number in the subject, and the user also sees it under "Your support requests" in Settings.
  - Given a staff reply, when it is sent, then it goes out from hello@themagiccoffin.com with the ticket number in the subject and the right threading headers, and the user's email reply lands back in the same ticket, not in a new one.
  - Given a ticket, when staff work on it, then they can set status (New, Open, Pending on user, On hold, Solved, Closed), priority (low, normal, high, urgent), category (account, writing, reading, safety question, school or university, bug, other), assignee and tags, and every change is kept in the ticket's history.
  - Given the reply box, when staff choose "Internal note", then the note is visible to staff only and is never emailed.
  - Given the inbox, when staff open it, then they see views (My tickets, Unassigned, All open, Pending on user, Solved, Spam) with counts, and a first-reply timer against the target set in admin settings (proposal: one working day).
  - Given a ticket set to Pending on user, when the user doesn't answer for 7 days, then it is solved automatically with a polite email; a solved ticket the user replies to reopens; a closed ticket stays closed and a reply creates a follow-up ticket linked to it.
  - Given canned replies, when staff insert one, then it fills in the user's name and language (English or Română) and can be edited before sending.
  - Given two tickets about the same problem from the same person, when staff merge them, then the messages join in one ticket and the person is told the new number.
  - Given a ticket about unlawful or harmful content or a child's safety, when staff press "Convert to report", then a report is opened in the moderation queue (S1-E10-03) with the ticket linked, and safeguarding rules apply (S1-E10-10).
  - Given a ticket that asks for a person's data, a correction or deletion, when staff press "Open data request", then a data request starts in S1-E11-09 with its legal deadline.
  - Given the requester is under 16, when staff open the ticket, then a banner says so and shows the safeguarding guidance; the profile panel shows the age group (13 to 15, 16 to 17, 18+), never the year of birth or the age check result.
  - Given spam, when staff mark a ticket as spam, then it moves to the Spam view, no reply is sent and the sender's later emails go there too.
  - Given retention, when a ticket has been closed for 2 years (proposal), then it is deleted; until then it is included in that user's data export.
  - Given the admin site's roles, when a moderator or support agent opens tickets, then they see only what their role allows (section 1.8.3), and every view and action is in the audit log.
- **Legal and compliance:** DSA art. 12 (a single, easy contact point for users) and the TCO contact point stay the web form (S1-E10-02); tickets never replace reports. GDPR: tickets hold personal data, so they follow retention, export and deletion; if a helpdesk engine is used it is a processor with an EU-hosted DPA. Email provider must have an EU region. Minors: staff reply in the ticket only, never by private message.


---

##### S1-E11-14 Landing pages for contests and campaigns

As an admin, I want to build a page for a contest or campaign from ready-made blocks so that we can announce it without a developer or a new release.

- **Priority:** Should · **Size:** L · **Depends on:** S1-E11-01, S1-E11-06 (the website editing pattern), S1-E10-05 (picture check), S1-E7-01 (for "Remind me"), S1-E12-02 (approved campaigns for the Sponsor block)
- **Added:** 17 Oct 2026 at Robert's request ("a way for admins to make landing pages too for whenever there's a competition and so on"). Canvas 8.14 and the public contest page.
- **Where the data lives (proposal):** in the app's database, not the website's, because a landing page shows stories, contest entries and signed-in actions. Written only through `admin_*` functions like every other staff change.
- **Acceptance criteria:**
  - Given Website › Landing pages, when an admin creates a page (website pages are admin-only, decided 17 Oct 2026, 19:19), then they pick a type (Contest, Campaign or Information), a name and an address `<site>/c/<slug>` (proposal), where the site comes from the brand config (today ghemotoc.themagiccoffin.com, decided 17 Oct 2026, 12:50); a slug on the reserved names list or already in use is refused.
  - Given the editor, when a page is built, then it uses only fixed blocks: Hero, Text, Key dates, Who can enter, Prize, How to enter, Rules, Sponsor, Featured stories, Questions and answers, Remind me. There is no free HTML, no custom script and no custom colour; the look comes from one of four brand themes.
  - Given any block, when it is edited, then English and Română are edited side by side with a phone and desktop preview.
  - Given blocks, when staff reorder them, then they move with Up and Down buttons that work from the keyboard (no drag-only control), and the page keeps one heading order (WCAG 2.2 AA).
  - Given a picture in a block, when it is added, then alt text is required and the picture goes through the picture check before it can be published (S1-E10-05).
  - Given a Sponsor block, when staff fill it, then they can only pick a sponsor campaign already approved in Sponsors (S1-E12-02), and it shows "Presented by <sponsor>" labelled as sponsored.
  - Given a Featured stories block, when stories are picked by hand or by tag, then only stories rated for the youngest age group the page targets can appear, and a story hidden by moderation drops off at once.
  - Given a Remind me block, when a signed-in reader taps it, then they get one in-app notification when entries open and nothing else; signed-out readers are asked to sign in.
  - Given Publish, when the checks run, then publishing is refused unless both languages are complete, every picture has alt text and passed the check, a Contest page has key dates and a Rules link, and the sponsor campaign is approved.
  - Given a page with a Sponsor block or a contest open to under-18s, when it is published, then an admin must publish it (proposal; Q31 itself logs no second approver for website copy).
  - Given "Show from" and "Take down" dates, when they arrive, then the page goes live or comes down at 00:00 Romanian time; after take-down the address shows "This contest has ended" and the results, unless staff archive the page.
  - Given any change, when it is saved, then a new version is kept, "Restore" brings an older one back as a draft and the audit log records who, when and the before and after content.
  - Given the page, when it is live, then it can be linked from a notice banner (S1-E11-10), a Discover featured slide, a house ad (S1-E12-05) and social posts, and it has a teaser preview for shared links (S1-E4-04).
- **OPEN:** whether a landing page may also carry an ad-network ad. Proposal: no; only the contest's sponsor or a house ad.
- **Legal and compliance:** copy aimed at minors must not pressure them (no countdown timers, no "only today"), in line with the no-dark-patterns principle (1.1). A sponsored page is a commercial communication: label it (DSA art. 26 as good practice). Contest pages link to the full contest rules (S1-E11-15).

---

##### S1-E11-15 Contests: set up, entries, judging and results

As an admin, I want to run a writing contest from the admin site so that writers can enter with a story they post on Ghemotoc and we can publish results and certificates without spreadsheets.

- **Priority:** Should · **Size:** L · **Depends on:** S1-E11-14, S1-E3-05 (story settings), S1-E3-06 (ratings), S1-E8-12 (certificates), S1-E10-04 (statements of reasons)
- **Added:** 17 Oct 2026 at Robert's request. Canvas 8.15. No contest is planned for now; contests are a campaign for later (decided 17 Oct 2026, 12:34). Who can enter uses the platform age groups (13 to 15, 16 to 17, 18 and over).
- **Acceptance criteria:**
  - Given Contests, when an admin creates a contest, then they enter the name in English and Română, the dates entries open and close and the results date, who can enter (age groups 13 to 15, 16 to 17, 18 and over; markets; languages), what counts as an entry, an optional word limit, the prize and who delivers it, the judges, an optional approved sponsor campaign and the landing page.
  - Given a contest, when it is opened, then opening is refused until the full contest rules are published in both languages and linked from the landing page.
  - Given an eligible writer, when they open a story's settings during the entry window, then they see "Enter <contest>" and can enter one story (one entry per writer, proposal) and withdraw it before the closing date.
  - Given a contest open to under-16s, when a story is entered, then it must be rated All ages or 13+ (proposal).
  - Given an entry, when staff look at it, then they see the pen name, the age group only (never the year of birth), the rating, the date and the status (Valid, Withdrawn, Disqualified). Staff never edit an entry's words (1.8.5).
  - Given an entry breaks the rules, when staff disqualify it, then a reason is required and the writer gets a statement of reasons (S1-E10-04) and can appeal (S1-E10-07).
  - Given judging, when results are chosen, then judges are our staff plus any named partner judges; there is no public vote (proposal); the sponsor has no say in the result.
  - Given results, when an admin publishes them, then the landing page shows winners and finalists by pen name only, never age, school or real name unless the writer (and, under 16, a parent or guardian) agreed.
  - Given published results, when staff choose "Issue certificates", then participants, finalists and winners get certificates through S1-E8-12.
  - Given a prize for a winner under 16, when it is sent, then staff have the parent or guardian's consent on file for the prize delivery details (proposal; see legal notes).
- **Legal and compliance (research G6, 17 Oct 2026; a lawyer and an accountant confirm before the first contest):**
  - A free contest judged by a jury doesn't match an advertising lottery, which needs a random draw (OG 99/2000 art. 41). It doesn't match gambling either, which needs a fee and a random result among other conditions (OUG 77/2009 art. 3(1)); skill and knowledge games are excluded (art. 11(1)(b) and (d)). **OPEN:** whether a sponsor-funded prize needs an ONJN opinion (art. 3(3) could not be read).
  - Notarised rules and a published winners' list are required only for advertising lotteries (OG 99/2000 art. 42 and 43). Online contest conditions must still be easy to find and clearly presented (Law 365/2002 art. 6(2)(d)), and promised prizes must be awarded (Law 363/2007, Annex 1, point 19).
  - Prize tax: 10% on the part of each prize above 600 lei, withheld by whoever pays the prize, declared on D100 by the 25th of the next month and reported per winner on D205 by the end of February (Fiscal Code art. 108 to 110). Prizes to winners abroad and in-kind prizes need the accountant.
  - Advertising aimed at minors is limited (Law 148/2000 art. 16); a sponsor's credit must not call on children to buy (Law 363/2007, Annex 1, point 5).
  - A company can't be the beneficiary of sponsorship under Law 32/1994 art. 4, so a sponsor paying Ghemotoc for a contest is a commercial deal, not sponsorship in that law's sense.
  - Writers keep every right in their story: moral rights can't be waived (Law 8/1996 art. 11), a grant of rights in future works is void (art. 42(2)) and any licence must be in writing (art. 43). The rules may ask only for a licence to show the entry and the results on Ghemotoc.
  - School partners: research G1 (only schools can put a contest on official calendars).


---

##### S1-E11-16 Add and manage public-domain classics

As an admin, I want to add public-domain books, stories, poems and plays from the admin site so that the Classics shelf grows without a developer and only works that are really free appear.

- **Priority:** Should · **Size:** L (split before building: 16a adding a work with the public-domain check and publishing it; 16b importing the lists in content/classics and the 1 January suggestions) · **Depends on:** S1-E11-01, S1-E3-01, S1-E3-03, S1-E5-06
- **Added:** 17 Oct 2026 at Robert's request ("don't forget how the admins can add these classic public domain works"). Canvas 8.16 Classics. Data: content/classics/*.csv (research G5).
- **Acceptance criteria:**
  - Given Stories › Classics, when an admin adds a work (only the admin role manages Classics; content editors also hold the admin role, decided 17 Oct 2026, 12:44), then they enter the title, author, the author's year of death, the original language, the kind (novel, short story, fairy tale, poem, play, essay), the source edition with its link (for example Wikisource) and, if the text is a translation, the translator and the translator's year of death.
  - Given those details, when the form checks them, then it shows per market whether the work is free: Romania, the EU and the UK when 70 years have passed since 1 January after the author's death (Law 8/1996 art. 28(1) and 34; research G5), and for a translation also after the translator's death; the US by publication date (research G5). A work can be published only in markets where it is free; elsewhere it is hidden.
  - Given a work, when the text is added, then staff paste it or upload a plain text or Markdown file; it is split into chapters at headings, with a preview where chapter titles can be fixed. Modern editors' notes, introductions and footnotes are left out unless they are free too.
  - Given the text, when staff correct a typo from the source, then the change is saved as a new version with a reason; staff never rewrite or abridge the work (proposal).
  - Given a work ready to publish, when it is published, then it appears under the official "Ghemotoc Classics" account with the "Public domain" label, the author's dates, the source edition, a rating chosen by staff (All ages, 13+, 16+ or 18+; for example Ion is not All ages) with a content note where needed, a category and tags, and an automatic or drawn cover.
  - Given a work, when it is published, then an admin publishes it (proposal) and the audit log records who added, checked and published it.
  - Given the research lists in content/classics, when staff import them, then each row becomes a draft with its details filled in, and its text still has to be added and checked (16b).
  - Given 1 January, when the year changes, then the Classics area lists authors whose works have just become free (died 70 years before) as suggestions to add (16b; research G5 notes, for example, the authors who died in 1956 on 1 January 2027).
  - Given a reader report that a classic isn't public domain or the text is wrong, when it arrives, then it goes to the moderation queue like any report (S1-E10-01), and staff can unpublish the work at once.
- **Legal and compliance:** only texts we know are free are used; a modern translation or edition can still be protected even when the author's work is free. Public-domain status differs by country, so the per-market check decides where a work is shown. Classics pages follow the normal ad rules (at most 2 slots a page). A lawyer's check of the public-domain test is on the lawyer's list (section 6).

##### S1-E11-17 Invite links for the March test

As an admin, I want to make invite links so that only the adults I invite can join the March test.

- **Priority:** Must · **Size:** S · **Depends on:** S1-E2-01, S1-E11-01; S1-E11-02 (the Users area where the Invites tab sits; stub the menu entry until it lands)
- **Added:** 17 Oct 2026, 13:01 (Robert, chat): "Make an inviting link... It can technically have the same logic as we have with the teachers inviting pupils to class." Board: 8.5 Users, Invites tab (to be drawn, docs/board-fixes.md).
- **Data:** one shared `invites` table used by this story and later by class spaces (S1-E8-11a): `id`, `user_id` (the staff member or teacher who made it, not null, references `profiles.id`), `purpose` (`platform` or `class_space`), `space_id` (only for class spaces), a random code stored hashed, `max_uses`, `use_count`, `expires_at`, `revoked_at`, an optional private `note` ("for Ana, beta tester"). RLS: only staff with the admin role read and write platform invites, through `admin_*` functions; nobody reads codes back after creation.
- **Acceptance criteria:**
  - Given Users › Invites, when an admin chooses "Make an invite link", then they set how many people it admits (default 1), when it expires (default 14 days) and an optional private note, and get a link `<site address from the brand config>/join/<code>` with a Copy button; the code is shown once.
  - Given an invite link, when someone opens it while `invite_only` is on, then sign-up opens with the code filled in (S1-E2-01); an expired, revoked or used-up link shows a kind "This invitation has ended, ask the person who invited you for a new one" page and stores nothing.
  - Given a successful sign-up, when the account is created, then `use_count` goes up in the same transaction, so two people can't both use the last place.
  - Given the list of invites, when an admin views it, then they see the note, uses (for example 1 of 1), expiry, status (Active, Used up, Expired, Revoked) and who made it, never who used it by name; they can revoke an active invite or make a new link.
  - Given any invite action, when it happens, then the audit log records who made, revoked or used up which invite.
  - Given the same mechanism, when class spaces arrive (S1-E8-11a), then they reuse the `invites` table and join function with `purpose = class_space`, instead of building a second one.
- **Legal and compliance:** the note is for the admin's memory only; keep it to a first name or a role, and it is deleted with the invite 90 days after expiry (proposal, S1-E13-04 retention). The invitee's email is not stored on the invite. Invites never bypass the `adults_only` check (S1-E2-02).

##### S1-E11-18 Edit interface text

As an admin, I want to change the app's interface text (buttons, errors, labels) from the admin site so that fixing or improving copy never needs an engineer or a new release.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E11-06 (the same editor and version pattern), S1-E1-04, S1-E11-01; back end: `interface_text_overrides` in the app's database (section 1.6; B34 in section 1.7)
- **Added:** 17 Oct 2026, 19:16 to 19:19 (Robert, chat). The app's interface text stays in the ro and en language files, but staff can edit it from the admin site so changing copy never needs an engineer; edited text is stored in the database on top of the file text, and the files stay the default and what CI checks (19:16). In the March MVP, straight after the CMS, reusing its editor (19:19). Admin-only (19:19). One version per language, not per country, but stored by BCP 47 locale code (`ro`, `en`, later `en-GB`, `en-US`) so regional variants can come later (19:19).
- **Data:** `interface_text_overrides` (names are proposals): `id`, `key` (must exist in the locale files), `locale` (a BCP 47 code; `ro` or `en` for March), `text`, `status` (draft, scheduled, published, retired), `show_from`, `user_id` (the admin who saved it, not null, references `profiles.id`), `created_at`, `updated_at`; earlier versions are kept for Restore. RLS: anyone, signed in or not, can read published rows (the app needs them on every screen); writes only through `admin_*` functions.
- **Acceptance criteria:**
  - Given the admin site, when an admin opens Website › Interface text, then they see every key from the locale files with its current text in each language, and can search by the words shown on screen or by key.
  - Given a key, when an admin edits it, then the languages are edited side by side with a preview of the text as it will show (placeholders visible), and the file text is shown beside it as the default.
  - Given a key with plural forms (i18next `_one`, `_few`, `_other`), when it is edited, then each form is its own field and follows the same checks.
  - Given an override, when it is stored, then there is one version per language, not per country, keyed by a BCP 47 locale code (`ro`, `en`), so a regional variant such as `en-GB` or `en-US` can be added later without changing the table (decided 17 Oct 2026, 19:19); a regional variant falls back to its base language, then to the file text (proposal).
  - Given a "show from" date, when an admin publishes, then the override goes live at 00:00 Romanian time on that date (within a minute if the date is today) and the current text stays until then.
  - Given Earlier versions, when an admin presses Restore, then that text comes back as a draft and goes live only when it is published again.
  - Given "Reset to default", when an admin confirms it, then the override is retired and the app shows the file text again.
  - Given a save, when the text drops, adds or changes a placeholder from the file text (for example `{{productName}}` or `{{count}}`) or leaves a language empty, then the save is refused with the problem named; ş or ţ (cedilla) are changed to ș and ț (comma below) before saving, and the admin is told (CLAUDE.md rule 4).
  - Given the app starts in a language, when it loads its text, then it lays the published overrides for that language over the locale files; if the read fails it uses the file text and keeps working, and the read never blocks the first screen (proposal: fetched once and cached for the visit).
  - Given the locale files, when CI runs, then they stay the default and what `npm run i18n:check` checks. Keys exist only in the files: the admin site can't add a key, and an override whose key was removed from the files is ignored and listed for an admin to tidy up.
  - Given keys about age, consent, privacy, reporting or messaging rules, when they are listed, then they are marked as legal wording and the editor reminds the admin that the change must match the legal documents; like every key they are admin-only (decided 17 Oct 2026, 19:19).
  - Given anyone without the admin role (the owner excepted), when they try to save, publish, restore or reset, then the server refuses.
  - Given any save, publish, restore or reset, when it happens, then the audit log stores who, when, the key and locale, the go-live date and the before and after text.
  - Given the brand name check (S1-E1-01), when an override is saved, then it may use the `{{productName}}` placeholder but never the literal product name, so a rename stays a change in one place (decided 17 Oct 2026, 12:47).
- **Legal and compliance:** claims in interface text must stay true (Law 363/2007). Wording that repeats a legal duty must stay accurate: reporting and statement-of-reasons wording (DSA, Regulation (EU) 2022/2065, art. 16 and 17) and consent and privacy wording (GDPR art. 7 and 12: clear and plain language, consent as easy to withdraw as to give). Accessibility: the overridden text keeps the right `lang` attribute (WCAG 2.2, 3.1.1 and 3.1.2), and a control's accessible name keeps containing its visible label (2.5.3, Label in Name). Romanian text is checked by a native speaker before it goes live (Definition of Done).

##### S1-E11-19 Edit email templates

As an admin, I want to change the wording of every email the platform sends (sign-up, log-in link, change email, password reset and every later one) from the admin site so that no email needs an engineer or a dashboard paste.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E11-18 (the same editor, versions and audit log), S1-E2-01, S1-E2-05; back end: B09 and B34 in section 1.7
- **Added:** 25 Oct 2026, 09:18 to 09:21 (Robert, chat): "admin to edit any sort of template, sign up, change email, password reset, anything whatsoever". Built in the CMS-1 bundle, straight after S1-E11-18.
- **How it works:** Supabase Auth hands every email to a Send Email hook (an edge function, verified with the hook secret) instead of sending it from its own template. The function picks the template for the email type and the person's language, lays the published admin overrides over the default text in `src/locales/<lang>/email.json`, fills the locked placeholders and sends it through Brevo's HTTP API (the provider decided on 17 Oct 2026, 19:43). Notification emails (S1-E7-02) and every later email use the same sender. Locally it sends to Mailpit.
- **Acceptance criteria:**
  - Given Website › Email templates, when an admin opens it, then every email type is listed with its subject, heading, body, button and footer in each language, the default text beside it and a preview of the finished email.
  - Given a template, when it is edited, then its placeholders ({code}, {link}, {productName}, {name}) show as locked chips: an admin can move them in the text but not delete or change them, and a template missing a required placeholder can't be published.
  - Given the codes in an email (sign-up, log-in, change email), when it is sent, then the code is the one Supabase Auth made: random, single use and expiring (one hour by default, a setting); we never make or store a code ourselves.
  - Given a "show from" date, Earlier versions, Restore and "Reset to default", when an admin uses them, then they behave as in S1-E11-18, and every change is in the audit log with the before and after text.
  - Given anyone without the admin role (the owner excepted), when they try to save, publish, restore or reset, then the server refuses.
  - Given the hook or Brevo fails, when an email is due, then Auth gets an error back (so the screen says the email couldn't be sent and offers to try again) and the failure is logged without the address, the code or the text (CLAUDE.md rule 12).
  - Given a new feature that needs an email or any other template, when it is built, then it ships with draft ro and en text in the locale files and is editable here from the first day (Robert, 25 Oct 2026, 09:16 to 09:17).
- **By hand:** `BREVO_API_KEY` and the hook secret as Edge Function secrets on staging, and turning on the Send Email hook in the Supabase dashboard (Authentication › Hooks). After that no template is pasted by hand again.
- **Legal and compliance:** Brevo is already on the processor list with a data processing agreement (decided 17 Oct 2026, 19:43). Emails carry no tracking pixels or tracked links (CLAUDE.md rule 7; Brevo's tracking switched off). Wording with legal weight follows the S1-E11-18 rules.

##### S1-E11-33 Custom staff roles

As the owner or an admin, I want to make a role with exactly the access a job needs (for example Marketing) and give it to people, so that nobody holds more than their work needs.

- **Priority:** Should · **Size:** M · **Depends on:** S1-E2-07a, S1-E11-01b · **Bundle:** CMS-2a
- **Added:** 8 Nov 2026 (Robert, Builder thread): a role is a named set of per-area permissions from a fixed list; an admin gives only what they hold; only the owner grants role management or opening a market; safeguarding, removal-order on-call and teacher checks stay separately ticked permissions; nobody changes their own role; every change goes in the audit log. Research doc "Research: CMS-2 page builder and custom staff roles".
- **Acceptance criteria:**
  - Given Staff › Roles, when the owner or an admin opens Custom roles, then they see every custom role with its access per area and who holds it, and can make a role with a name (2 to 40 characters, unique), what it is for (up to 200) and None, View or Change in each area.
  - Given an admin, when they pick access, then only areas they hold are offered, Change only where they hold Change, and the Roles area only to the owner; the database refuses anything else (`area_out_of_reach`).
  - Given safeguarding, removal orders or opening a market, when anyone makes a role, then those areas are never offered and the database never lets a custom role reach them.
  - Given a role that holds more than the signed-in person, when they see it, then it says only the owner can change or give it, and the database refuses every change to it (`role_out_of_reach`).
  - Given a custom role, when it is given to an account picked from a search, then that account becomes staff with exactly the role's areas in the staff menu, on top of any built-in role.
  - Given anyone, when they try to give a role to themselves, then the database refuses (`own_role`).
  - Given every change (make, change, remove, give, take back), when it is saved, then it needs a reason and is in the audit log with the before and after values.
  - Given a member, a visitor or a moderator, when they call the custom role functions, then the database refuses.

##### S1-E11-34 An easier page builder

As a moderator, an admin or someone in marketing, I want to build a landing page from ready blocks in a grouped menu, so that making a page needs no help from an engineer.

- **Priority:** Should · **Size:** M · **Depends on:** S1-E11-14, S1-E11-33 · **Bundle:** CMS-2b
- **Added:** 10 Nov 2026 (Robert, Builder queue): "an easier staff page builder for moderators, admins and marketing". Engage Grow Hub is for ideas only (block families, a section library).
- **Acceptance criteria:**
  - Given the landing page editor, when staff add a block, then "Add a block" groups the blocks into families (Top of the page, Text and pictures, Lists and steps, Contest details, Ending) with one line on what each block is for.
  - Given the new blocks (picture and text, cards with 2 to 4 cards, steps with 2 to 6 steps, a quote, a call to action), when they are saved, then the database checks their fields as it does the existing blocks, in ro and en.
  - Given a call to action or a card's link, when it is saved, then it must be a page on the site or an https address, or it is refused.
  - Given a new `landing_pages` staff area, when staff open landing pages, then the owner, admins, moderators and anyone with a custom role holding it can build them, while the home page, notices, help and interface text stay with `website_cms` (admins and the owner).
  - Given every save and publish, when it happens, then it is in the audit log.

##### S1-E11-35 Ready-made pages and copying

As staff building a page, I want to start from a ready-made layout and copy blocks and pages, so that a new page takes minutes.

- **Priority:** Should · **Size:** S · **Depends on:** S1-E11-34 · **Bundle:** CMS-2c
- **Acceptance criteria:**
  - Given "New page", when staff pick a layout (contest, call for submissions, event, plain page), then the page starts with that layout's blocks and starter words from the locale files, as a draft.
  - Given a block, when staff press Copy block, then a copy appears below it.
  - Given a page, when staff press Copy page, then a new draft with its own address is made and nothing goes live until it is published.
  - Given every copy, when it is made, then it is in the audit log.

##### S1-E11-QA Epic check: Admin site

As the founder, I want every story in this epic tested together end to end so that the pieces work with each other, not just alone.

- **Priority:** Must · **Size:** S · **Depends on:** S1-E11-01, S1-E11-02, S1-E11-06, S1-E11-10, S1-E11-12, S1-E11-17, S1-E11-18, S1-E11-19
- **Added:** 17 Oct 2026, 12:36 (Robert, chat): every epic ends with a quality-check story, and every prompt has a quality check built in. It covers the epic's March MVP stories (S1-E11-09a moved after March, 12:44) and comes last among them in the build order. The epic's after-March stories (S1-E11-03, S1-E11-04, S1-E11-05, S1-E11-07, S1-E11-08, S1-E11-11, S1-E11-13, S1-E11-14, S1-E11-15, S1-E11-16) get the same check when they land (proposal). Updated 17 Oct 2026, 19:14 to 19:19: the website CMS stories (S1-E11-06, 10, 12) and S1-E11-18 joined the March MVP, so this check covers them.
- **Main journeys:** an admin makes an invite link and an invited adult joins with it; staff sign in to the admin shell, find a user and act on the account, with every step in the audit log; an admin edits the Romanian market's home page in Română with a future "show from" date, adds a notice and a home page question, and a signed-out visitor sees them go live, while a visitor from a country with no page of its own sees the Romanian market's English page; an admin overrides a button label, sees it in the app, then resets it to the file text; a moderator and a content editor without the admin role are refused on every CMS and interface text action. (Data requests moved after March, 12:44.)
- **Acceptance criteria:**
  - Given the epic's stories are merged, when the end-to-end suite runs, then Playwright tests walk the main journeys across those stories with the seed personas `adult_writer`, `teen_17`, `kid_14_ok` and `kid_14_waiting` and the staff personas the epic uses, and every journey passes.
  - Given a journey breaks where two stories meet, when it is found, then it is fixed in this pull request or ticketed as a GitHub issue that names the stories involved.
  - Given every screen in the epic, when axe runs at 390, 768 and 1440 px wide, then it reports no serious or critical issues.
  - Given the RLS tests, when they run as one suite (`npx supabase test db`), then every policy on every table the epic touches has an allowed and a denied test, with no gaps.
  - Given `docs/code-tour.md`, when it is read, then it covers the epic: where its screens, hooks, tables, functions and jobs live and how one main journey travels through them.
  - Given the check is finished, when the pull request is opened, then it includes a short epic report listing what works, the known gaps and every stub or mock still on (with the story that removes it, `docs/mocks.md`).
- **Legal and compliance:** minors' journeys are tested with the under-16 (`kid_14_ok`, `kid_14_waiting`) and 16 to 17 (`teen_17`) personas, so the age gate, ratings, blocks and under-18 defaults are proved across stories, not only inside each one. In March only invited adults sign up (`adults_only`, decided 17 Oct 2026, 12:44), so the minor personas are seed data that prove these protections are ready before minors are let in. The test data is the seed personas only, never real user data (CLAUDE.md, Safety while building).

---
