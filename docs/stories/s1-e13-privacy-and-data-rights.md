> Source: CTO pack, fact-checked 17 Oct 2026. The master plan's Decisions made tab wins if they differ.

#### S1-E13 Privacy and data rights

**Back end and build order:** section 1.7, group F (screen 6.3), wave 5.

##### S1-E13-01 Privacy settings

As a user, I want simple privacy controls so that I decide what others see.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E5-05 (the messaging control is added by S1-E9-04)
- **Acceptance criteria:**
  - Given privacy settings, when they open, then they include profile visibility, who can message me, online status (off by default) and library visibility.
  - Given an under-18 user, when the account is created, then every setting starts at its most private value.
- **Legal and compliance:** GDPR Art 25(2) privacy by default. Online status is opt-in (research).
- **Built:** S1-E13-01; "Ask before I share contact details" and its heads-up on comments, forum posts, messages and the bio in MUST-1b (IDEA-20261108-6).

##### S1-E13-02 Download my data

As a user, I want to download everything I've put on the platform so that I have my own copy.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E3-02, S1-E7-01 for the ready notice (email until then); each later content type, such as messages from S1-E9-01, adds itself to the export
- **Updated:** 17 Oct 2026, 12:44 (Robert): after March. The March test is invited adults only and data requests arrive by email and are answered by hand; this story comes before going live. Priority unchanged.
- **Updated:** 17 Oct 2026, 12:34 (Robert): one ZIP with a machine-readable JSON file of everything about the account plus every story as a Word (.docx) file; no HTML copy.
- **Build note (Word builder):** this story comes before S1-E11-09a in the build order (09a depends on it), so this story builds the shared Word builder (one .docx per story, to the content and format rules in S1-E11-09's criteria) and S1-E11-09a and S1-E13-05 reuse it; nobody builds a second one. The Word work (about 18 hours) was counted in S1-E11-09a's estimate, so this story grows and 09a shrinks by the same amount; the MVP total is unchanged (size to re-check, see the follow-up in section 5).
- **Acceptance criteria:**
  - Given settings, when the user requests an export, then a background job builds one ZIP with a machine-readable JSON file of everything about the account (stories, chapters, comments, posts, sent messages and settings) plus every story as a Word (.docx) file made by the shared Word builder (decided 17 Oct 2026, 12:34).
  - Given the export, when it is built, then it also holds the user ID, the account data (email, handle, pen name, year of birth, the age check result with its date and method, consents), certificates and the reports the user made.
  - Given the export is ready, when the user is notified, then the download link needs sign-in and expires after seven days.
- **Legal and compliance:** GDPR Art 15 and Art 20 (one month to respond under Art 12(3)). The JSON file is the machine-readable copy Art 20 asks for; the Word files are a readable copy on top. S1-E13-05 lets a writer download single stories as Word, and S1-E11-09 sends the same ZIP for staff-handled requests; both reuse this story's Word builder. A 13 to 15-year-old can request their own export from their own signed-in account; a parent or guardian asking for a child's data is checked against the consent record (decided 16 Oct 2026, late evening, Q27).

##### S1-E13-03 Delete my account in the app

As a user, I want to delete my account from inside the app so that my data is gone when I leave.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E2-05 (offer the export from S1-E13-02 once it exists)
- **Updated:** 17 Oct 2026, 12:44 (Robert): after March. The March test is invited adults only and data requests arrive by email and are answered by hand; this story comes before going live. Priority unchanged.
- **Acceptance criteria:**
  - Given account settings on any platform, when the user chooses "Delete account" and signs in again to confirm, then the account is deactivated at once and permanently deleted after 14 days unless they cancel.
  - Given deletion completes, when other users view old forum threads, then the user's forum posts stay, shown under "Deleted user"; their stories and chapters are deleted with the account, and their comments are deleted too (decided 16 Oct 2026, late evening, Q47: only forum posts are kept).
  - Given an account is permanently deleted, when the purge runs, then its user ID is never given to another account.
  - Given content under an open legal case, when deletion runs, then only that content is kept until the case ends.
  - Given a web page, when someone without the app wants to delete, then a web deletion route exists too.
- **Legal and compliance:** GDPR Art 17; Apple guideline 5.1.1(v) and Google Play's account deletion requirement (check before relying on them). Keeping forum post text after deletion needs a legal basis and a line in the privacy notice (section 6); personal data inside a kept post can still be removed on request.

##### S1-E13-04 Retention schedule and log minimisation

As the founder, I want old personal data deleted automatically so that we keep only what we need.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E1-02
- **Updated:** 17 Oct 2026, 12:44 (Robert): after March. The March test is invited adults only and data requests arrive by email and are answered by hand; this story comes before going live. Priority unchanged.
- **Acceptance criteria:**
  - Given IP addresses we keep for security and abuse, when they are stored, then they are scrambled (a keyed hash whose key changes regularly) and deleted after 30 days (decided 16 Oct 2026, late evening, Q48).
  - Given soft-deleted content, unverified accounts and expired exports, when the nightly job runs, then each is purged on its schedule (30 days, 7 days and 7 days, canvas 8.7).
  - Given the real name printed on a class certificate, when the class has been archived for 30 days, then the nightly job deletes the name (decided 17 Oct 2026, 12:44).
  - Given aggregated metrics (daily totals such as `chapter_reads` and the March test numbers), when they are 3 years old, then the nightly job deletes them (Robert's default retention for aggregated data, decided 17 Oct 2026, 12:34).
  - Given the retention schedule, when it is changed, then `docs/retention.md` and the record of processing are updated in the same pull request.
- **Legal and compliance:** GDPR Art 5(1)(e) and Art 30. A scrambled IP address is still personal data (pseudonymised, not anonymous), so it stays in the record of processing.

##### S1-E13-05 Download my stories

As a writer, I want to download my stories as Word files (and later PDF) from Settings so that I have my own copy to edit, print or send to an agent.

- **Priority:** Should · **Size:** S · **Depends on:** S1-E13-02 (builds the shared Word builder), S1-E11-09 (09a adds `story-export` for staff requests, 09b the PDF)
- **Updated:** 17 Oct 2026, 12:44 (Robert): after March. The March test is invited adults only and data requests arrive by email and are answered by hand; this story comes before going live. Priority unchanged.
- **Updated:** 16 Oct 2026, late evening: Word from the first version (Q28, Q29); in the March MVP.
- **Added:** 16 Oct 2026 (late evening), Robert's request (chat): self-service "Download my stories".
- **Acceptance criteria:**
  - Given Settings › Download my data, when a writer opens it, then "Download my stories" offers Word (.docx) for one story or all of them; PDF joins the choice once 09b lands.
  - Given a request, when it is made, then the files are built in the background with the same contents as S1-E11-09 (every chapter including drafts, the dates and the user ID), the writer gets a notification when they are ready and the link needs sign-in and stops working after seven days.
  - Given a suspended writer, when they ask, then they can still download (S1-E10-06).
  - Given repeated requests, when a writer asks again for the same stories within 24 hours, then the earlier files are offered instead of new ones (proposal).
- **Legal and compliance:** the machine-readable copy in S1-E13-02 is what GDPR Art 20 requires; this is a convenience on top. The user ID in the files is the writer's own personal data and is shown only to them. 13 to 15-year-olds can use it on their own (decided 16 Oct 2026, late evening, Q27).

##### S1-E13-QA Epic check: Privacy and data rights

As the founder, I want every story in this epic tested together end to end so that the pieces work with each other, not just alone.

- **Priority:** Should · **Size:** S · **Depends on:** S1-E13-01, S1-E13-02, S1-E13-03, S1-E13-04, S1-E13-05
- **Added:** 17 Oct 2026, 12:36 (Robert, chat): every epic ends with a quality-check story, and every prompt has a quality check built in. Every story in this epic comes after March since decided 17 Oct 2026, 12:44 (invited adults only), so this check does too; it covers all of them and comes last.
- **Main journeys:** a user downloads their data, downloads their stories as Word files, deletes their account, and the retention jobs purge what is due.
- **Acceptance criteria:**
  - Given the epic's stories are merged, when the end-to-end suite runs, then Playwright tests walk the main journeys across those stories with the seed personas `adult_writer`, `teen_17`, `kid_14_ok` and `kid_14_waiting` and the staff personas the epic uses, and every journey passes.
  - Given a journey breaks where two stories meet, when it is found, then it is fixed in this pull request or ticketed as a GitHub issue that names the stories involved.
  - Given every screen in the epic, when axe runs at 390, 768 and 1440 px wide, then it reports no serious or critical issues.
  - Given the RLS tests, when they run as one suite (`npx supabase test db`), then every policy on every table the epic touches has an allowed and a denied test, with no gaps.
  - Given `docs/code-tour.md`, when it is read, then it covers the epic: where its screens, hooks, tables, functions and jobs live and how one main journey travels through them.
  - Given the check is finished, when the pull request is opened, then it includes a short epic report listing what works, the known gaps and every stub or mock still on (with the story that removes it, `docs/mocks.md`).
- **Legal and compliance:** minors' journeys are tested with the under-16 (`kid_14_ok`, `kid_14_waiting`) and 16 to 17 (`teen_17`) personas, so the age gate, ratings, blocks and under-18 defaults are proved across stories, not only inside each one. The test data is the seed personas only, never real user data (CLAUDE.md, Safety while building).

---
