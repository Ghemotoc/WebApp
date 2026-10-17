> Source: CTO pack, fact-checked 17 Oct 2026. The master plan's Decisions made tab wins if they differ.

#### S1-E11 Admin site

**Back end and build order:** section 1.7, group H (screens 8.1 to 8.12 and the website CMS), waves 3 and 5; how the admin site and CMS work is in section 1.8.

Plain components are fine here (design direction).

##### S1-E11-01 Admin shell with protected access

As staff, I want an admin site that only verified staff can reach so that powerful tools stay safe.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E2-07, S1-E1-02 (audit log)
- **Updated:** 16 Oct 2026 (late evening): navigation, sensitive reads and staff sessions (section 1.8).
- **Acceptance criteria:**
  - Given a user without a staff role or without completed two-factor sign-in, when they open any admin route, then they are refused by the server, not only hidden in the interface.
  - Given any admin action, when it is performed, then the audit log stores who, what, when and the before and after values.
  - Given a sensitive read (revealing an email, opening a draft, an export file, an evidence pack or a teacher's proof), when it happens, then it is logged too.
  - Given the audit log, when anyone tries to change or delete a row, then the database refuses, the owner included; admins and the owner can search it and export it as CSV.
  - Given a staff session, when 12 hours have passed (proposal), then the person signs in again; changing a role, starting an export for someone else, "Emergency disable" and removing part of a writer's text ask for a fresh two-factor code.
  - Given the menu, when a staff member opens the admin site, then it shows only the areas their role allows (section 1.8.2); the server still checks every action.
- **Legal and compliance:** GDPR Art 32 and accountability (Art 5(2)).

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
- **Added:** 16 Oct 2026, Robert's decision (chat): launch in English and Romanian, for English-speaking countries and Romania. Updated 17 Oct 2026, 11:48: Romania opens first; English-speaking countries open later, one by one, each after its legal check (replaces "all at the same time", 16 Oct evening). At launch only Romania is Open; the others show Ready to open or Closed.
- **Acceptance criteria:**
  - Given admin settings, when staff look at Markets and languages, then each language (English, Română to start) and each market (UK, Ireland, US, Canada, Australia, New Zealand, Singapore, Romania, others) shows Open, Ready to open or Closed.
  - Given a language with no moderator who reads it on the rota, when staff try to open it, then it is blocked.
  - Given a market whose legal check is not done, when staff try to open it, then it is blocked.
  - Given Australia, when staff look at it, then it is open to people 16 and over only and closed to under-16s until a lawyer says otherwise (decided 16 Oct 2026, late evening, Q19; S1-E2-10).
  - Given story creation, when a writer picks the story language, then only open languages can be chosen; others show "Coming when we have moderators for it".
  - Given the interface, when a user picks a language, then English and Română are available.
- **Legal and compliance:** each market has its own child-safety law (research H1, 16 Oct 2026): for example the UK Online Safety Act (children's risk assessment and highly effective age assurance), Australia's under-16 social media minimum age (in force since 10 Dec 2025), US COPPA and state laws, and Ireland's GDPR consent age of 16. The legal check per market comes before opening it, so if every English-speaking market opens alongside Romania (OPEN, see above), each of those checks has to be done before the March test. Australia: closed to under-16s until a lawyer says otherwise (Q19); whether the law applies to Ghemotoc at all is on the lawyer's list (section 6).

##### S1-E11-06 Website home page copy

As an admin, I want to change the words at the top of the public website's home page from the admin site so that we can refresh the message monthly or so without a new release.

- **Priority:** Should · **Size:** M · **Depends on:** S1-E11-01, S1-E11-03, S1-E2-07, the website's own database and the `website-cms` bridge (a new CMS built from scratch, decided 16 Oct 2026, Q54; sections 1.2 and 1.8.6; group A and B31 in section 1.7)
- **Updated:** 16 Oct 2026 (late evening): today's live copy, roles.
- **Added:** 16 Oct 2026, Robert's comment (canvas, 1.1 Website home page hero).
- **Acceptance criteria:**
  - Given admin settings, when staff open Website home page, then they can edit the line above the headline, the headline on two lines, which headline word gets the gold underline, the line under the headline, the two button labels and the three short points, prefilled with the copy that is live now (the headline is "Write stories. Get read." and the line under it is "Post your stories, poems and essays, one chapter at a time, and find the people who want to read them.", decided 16 Oct 2026, late evening).
  - Given any edit, when staff type, then a live preview shows the hero text in the website's fonts and colours (text only, no drawings or images).
  - Given the English and Română tabs, when staff switch, then each language has its own copy and preview; one version holds both languages and it can't be published unless both are filled in.
  - Given the character limits (proposal: line above the headline 50, headline 40 across both lines, line under it 170, each button 20, each point 30), when a field is empty or over its limit, then its counter turns red, the field is marked invalid for screen readers and Publish is refused with the list of fields to fix.
  - Given a "Show from" date, when staff publish, then the new version goes live at 00:00 Romanian time on that date (or within a minute if the date is today) and the current copy stays up until then; Save draft keeps the work without changing the website.
  - Given a publish, when it is saved, then the audit log stores who, when, the date it goes live and the before and after copy (S1-E11-01).
  - Given a content editor or an admin, when they save or publish, then it works; anyone else is refused by the server (section 1.8.3).
  - Given Earlier versions, when staff press Restore on one, then its copy in both languages comes back into the editor as a draft and goes live only when it is published again.
  - Given the public website, when the home page loads, then it reads the hero copy for the visitor's language from the website's own database (decided 16 Oct 2026), never from the app's database, and shows the last published version if the read fails.
- **Legal and compliance:** consumer law: the copy must not mislead (Law 363/2007 on unfair commercial practices, from Directive 2005/29/EC). Claims such as "free", "no tracking ads" and "you keep your rights" must stay true for as long as they are live, so check them against the current terms and any paid plans before publishing; calling something "free" when users have to pay is on the always-unfair list (Annex I, point 20, to verify). Accessibility: the headline stays the page's one `h1`, the gold underline is decoration only and the `lang` attribute matches the copy's language (WCAG 2.2, 1.3.1 and 3.1.1). Four eyes (decided 16 Oct 2026, late evening, Q31): home page copy is logged only; other people review copy before it goes live, outside the tool.

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
  - Given a support person, when they open a story, then they see its metadata but not the change controls; given a content editor, when they open Stories, then the server refuses.
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

- **Priority:** Must (GDPR) · **Size:** L (split before building: 09a the request log, identity check, deadline, the machine-readable copy and the Word files, in the March MVP; 09b the PDF files, after March) · **Depends on:** S1-E11-01, S1-E11-02, S1-E13-02, S1-E2-07, S1-E7-01; S1-E2-03 for requests made by a parent; back end: section 1.7, B28
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
  - Given the machine-readable copy, when it is built (09a), then it reuses the S1-E13-02 export (JSON of everything the user put on Ghemotoc plus their account data, including the user ID) and the Word file for each story; no EPUB (decided 16 Oct 2026, late evening, Q28).
  - Given the files are ready, when staff choose, then they can send one file per story or one zip of all; the user gets a link that needs sign-in (or, for a parent, a one-time link to the checked email address) and expires after seven days.
  - Given the files, when staff look at the request, then they see the file names and sizes; opening a file's contents is possible but logged, because staff don't need to read them.
  - Given a request is closed, when it is stored, then the log keeps the user ID, the type, the dates, the identity check, which files were sent and who handled it, but not the files; export files are deleted after seven days (S1-E13-04).
  - Given a moderator or a content editor, when they open Data requests, then the server refuses; support, admins and the owner can use it.
- **Legal and compliance:**
  - GDPR articles 12(3), 12(6) and 15(3) below are not in the research files (to verify against the regulation's text). GDPR Art 15 (a copy of the data, in a commonly used electronic form when the request was made electronically, Art 15(3)), Art 20 (portability: structured, commonly used and machine-readable), Art 12(3) (one month, extendable by two further months with notice within the first month), Art 12(6) (identity check) and Art 5(2) (the log is our proof).
  - GDPR requires the machine-readable copy, not Word or PDF; the Word files are a service on top. Decided (Q29): 09a and Word are in the March MVP, about 30 hours (12 for the request log and deadline, 18 for Word); PDF after March.
  - Under-16s, decided (Q27): a 13 to 15-year-old can download their own data from their own signed-in account; requests made on a child's behalf go through the parent or guardian checked against the consent record (S1-E2-03). Minors' legal capacity follows the Civil Code (art. 41 for 14 to 17-year-olds); an avocat confirms (section 6).
  - Tools: recommendation (Q49, pending): the `docx` npm library in an edge function for Word; the PDF tool is OPEN (question 34f). A library inside the edge function is simplest, while an HTML-to-PDF renderer gives tagged, accessible PDFs. A hosted renderer would be a new processor and needs a data processing agreement.
  - Large exports run as a job per story and are zipped at the end, so edge function time limits are never hit.

##### S1-E11-10 Website notice banners

As a content editor, I want to put a short notice at the top of the website (for example "The First Chapter contest opens in February") so that visitors see news without a new release.

- **Priority:** Should · **Size:** S · **Depends on:** S1-E11-01, S1-E2-07; back end: the website's own database and the `website-cms` bridge (section 1.7, B31)
- **Added:** 16 Oct 2026 (late evening), Robert's request (chat): website CMS banners.
- **Acceptance criteria:**
  - Given Website › Banners, when a content editor creates a notice, then they enter the text in English and Română (each up to 120 characters, proposal), an optional link to one of our own pages, a type (news, contest or important) and the pages it shows on (every page or the home page only).
  - Given a notice, when it is saved, then it has a "Show from" date and an optional "Show until" date, both at 00:00 Romanian time, and it can't be published unless both languages are filled in.
  - Given two notices for the same page and time, when the website loads, then only one shows: the one with the latest "Show from" date.
  - Given the type, when the notice is shown, then its colours come from the design tokens and meet 4.5:1 contrast; it doesn't move focus, doesn't animate and is a labelled region that screen readers can find.
  - Given a visitor closes a notice, when they keep browsing, then it stays closed for that visit only (session storage, so no consent is needed).
  - Given a publish or a change, when it is saved, then the audit log stores who, when and the before and after; earlier versions can be restored as drafts.
  - Given anything a sponsor pays for, when staff try to put it in a notice, then they can't: notices carry no sponsor names or logos, and paid content goes through Sponsors (S1-E12).
- **Legal and compliance:** keeping sponsors out of notices keeps ads labelled and in their own slot (DSA art. 26 as good practice). Claims in notices must be true (Law 363/2007).

##### S1-E11-11 Seasonal doodle schedule

As a content editor, I want to plan which seasonal doodle shows on which dates so that Discover and Search change with the seasons without a new release.

- **Priority:** Could · **Size:** S · **Depends on:** S1-E11-01, S1-E2-07, the doodle set (canvas 11.1); back end: B30 in the app's database (section 1.7)
- **Added:** 16 Oct 2026 (late evening): the admin part of S1-E5-07, moved here so the website CMS tools sit together.
- **Acceptance criteria:**
  - Given Website › Seasonal doodles, when a content editor adds an occasion, then they set a name, a date range (with "every year"), the doodle and where it shows (the Discover greeting, the Search popular tags or both).
  - Given the doodle choice, when the editor picks one, then they choose only from the approved SVG doodles shipped with the app; new doodles arrive as SVG files in a normal release, never as uploads.
  - Given two occasions that overlap, when a date falls in both, then the shorter one wins; a season's default doodle covers days with no occasion.
  - Given the schedule, when it is shown, then a year view shows every occasion and any gaps, with a preview in light and night mode.
  - Given a change, when it is saved, then it applies within a minute with no release and is logged.
- **Legal and compliance:** keep occasions inclusive; staff choose and no religious or political occasion is on by default. OPEN (from S1-E5-07): whether occasions follow the reader's country, and whether the website shows them too.

##### S1-E11-12 Help pages and questions

As a content editor, I want to write and update help pages and frequently asked questions in English and Română so that the website and the app answer common questions without a new release.

- **Priority:** Should · **Size:** M · **Depends on:** S1-E11-01, S1-E2-07, S1-E1-04, S1-E14-01; back end: the website's own database and the `website-cms` bridge (section 1.7, B31)
- **Added:** 16 Oct 2026 (late evening), Robert's request (chat): website CMS help and FAQ pages.
- **Acceptance criteria:**
  - Given Website › Help and questions, when a content editor writes a help page, then it has a title, a web address, a section and a body in the safe Markdown subset, in both languages.
  - Given a question, when the editor writes it, then it has the question, the answer, its order and where it shows (the website home page, the help centre or both).
  - Given the first version, when the CMS starts, then the questions live on the website on 16 Oct 2026 are imported as version 1, including "What is a class space?".
  - Given an edit, when it is published, then it follows the CMS way of working: a preview, a "Show from" date, both languages required, earlier versions with Restore and an entry in the audit log (section 1.8.6).
  - Given an answer about age checks, parental consent, messaging rules, privacy or money, when it is published, then it needs an admin, not only a content editor, because it repeats a promise made in the legal documents (proposal; the Decisions made tab logs Q31 as "website copy goes live without a second approver for now", so this exception is **OPEN** for Robert).
  - Given a link inside a help page, when it is saved, then links to our own pages must work, or saving is refused with the broken link named.
  - Given the app, when a user opens Help, then it shows these same pages in their language.
  - Given any help page, when it is shown, then it has one `h1`, real headings and the right `lang`.
- **Legal and compliance:** if a help page and the terms or privacy notice disagree, the legal documents win and the help page is fixed the same day. Plain language a 13-year-old can follow (DSA art. 14(3)). Claims must be true (Law 363/2007).

---

##### S1-E11-13 Support tickets inside the admin site

As a staff member, I want every support request to arrive as a ticket in the admin site, linked to support@ghemotoc.com, so that we answer every person from one place with the user's account, reports and data requests beside the conversation.

- **Priority:** Must · **Size:** L (split before building: 13a inbox, ticket view and email in and out; 13b views, timers, canned replies, merge and reports) · **Depends on:** S1-E11-01, S1-E2-07, S1-E14-04, S1-E7-02 (email provider), S1-E10-02, S1-E11-09; back end: `tickets`, `ticket_messages`, `ticket_events`, an inbound-email webhook and an outbound mail sender (section 1.7)
- **Added:** 17 Oct 2026, Robert (chat). Slice: after March (proposal); for the March MVP, Contact us messages arrive at support@ghemotoc.com and staff answer from that mailbox. Robert's words: "I do want the ticketing system to be integrated in the admin portal where everything is available", linked to a general email address and following normal ticketing logic. Refines Q60. Engine decided 17 Oct 2026: a ready-made external helpdesk (EU data hosting, DPA) runs behind these screens through its API; email in and out, threading and spam filtering come from the helpdesk, and our admin site shows and answers every ticket. Which product is **OPEN** (cheapest suitable option, research pending).
- **Acceptance criteria:**
  - Given an email to support@ghemotoc.com, a Contact us form (S1-E14-04) or an in-app message, when it arrives, then a ticket is created with a number (#1042), subject, channel, the first message and, if the sender has an account, their user ID and username; an email from an unknown address creates a ticket marked "email only".
  - Given a new ticket, when it is created, then the sender gets an acknowledgement email from support@ghemotoc.com with the ticket number in the subject, and the user also sees it under "Your support requests" in Settings.
  - Given a staff reply, when it is sent, then it goes out from support@ghemotoc.com with the ticket number in the subject and the right threading headers, and the user's email reply lands back in the same ticket, not in a new one.
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

As a content editor, I want to build a page for a contest or campaign from ready-made blocks so that we can announce it without a developer or a new release.

- **Priority:** Should · **Size:** L · **Depends on:** S1-E11-01, S1-E11-06 (the website editing pattern), S1-E10-05 (picture check), S1-E7-01 (for "Remind me")
- **Added:** 17 Oct 2026 at Robert's request ("a way for admins to make landing pages too for whenever there's a competition and so on"). Canvas 8.14 and the public contest page.
- **Where the data lives (proposal):** in the app's database, not the website's, because a landing page shows stories, contest entries and signed-in actions. Written only through `admin_*` functions like every other staff change.
- **Acceptance criteria:**
  - Given Website › Landing pages, when a content editor or admin creates a page, then they pick a type (Contest, Campaign or Information), a name and an address `ghemotoc.com/c/<slug>` (proposal); a slug on the reserved names list or already in use is refused.
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
- **Added:** 17 Oct 2026 at Robert's request. Canvas 8.15. The First Chapter contest (writers aged 13 to 19) is the first planned contest.
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
