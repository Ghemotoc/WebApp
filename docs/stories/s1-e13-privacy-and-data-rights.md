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

##### S1-E13-02 Download my data

As a user, I want to download everything I've put on the platform so that I have my own copy.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E3-02, S1-E7-01 for the ready notice (email until then); each later content type, such as messages from S1-E9-01, adds itself to the export
- **Acceptance criteria:**
  - Given settings, when the user requests an export, then a background job builds a ZIP with machine-readable JSON and readable HTML of stories, chapters, comments, posts, sent messages and settings.
  - Given the export, when it is built, then it also holds the user ID, the account data (email, handle, pen name, year of birth, the age check result with its date and method, consents), certificates and the reports the user made.
  - Given the export is ready, when the user is notified, then the download link needs sign-in and expires after seven days.
- **Legal and compliance:** GDPR Art 15 and Art 20 (one month to respond under Art 12(3)). Word copies of stories are S1-E13-05 and S1-E11-09. A 13 to 15-year-old can request their own export from their own signed-in account; a parent or guardian asking for a child's data is checked against the consent record (decided 16 Oct 2026, late evening, Q27).

##### S1-E13-03 Delete my account in the app

As a user, I want to delete my account from inside the app so that my data is gone when I leave.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E2-05 (offer the export from S1-E13-02 once it exists)
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
- **Acceptance criteria:**
  - Given IP addresses we keep for security and abuse, when they are stored, then they are scrambled (a keyed hash whose key changes regularly) and deleted after 30 days (decided 16 Oct 2026, late evening, Q48).
  - Given soft-deleted content, unverified accounts and expired exports, when the nightly job runs, then each is purged on its schedule (30 days, 7 days and 7 days, canvas 8.7).
  - Given the retention schedule, when it is changed, then `docs/retention.md` and the record of processing are updated in the same pull request.
- **Legal and compliance:** GDPR Art 5(1)(e) and Art 30. A scrambled IP address is still personal data (pseudonymised, not anonymous), so it stays in the record of processing.

##### S1-E13-05 Download my stories

As a writer, I want to download my stories as Word files (and later PDF) from Settings so that I have my own copy to edit, print or send to an agent.

- **Priority:** Should · **Size:** S · **Depends on:** S1-E13-02, S1-E11-09 (09a makes the Word files, 09b the PDF)
- **Updated:** 16 Oct 2026, late evening: Word from the first version (Q28, Q29); in the March MVP.
- **Added:** 16 Oct 2026 (late evening), Robert's request (chat): self-service "Download my stories".
- **Acceptance criteria:**
  - Given Settings › Download my data, when a writer opens it, then "Download my stories" offers Word (.docx) for one story or all of them; PDF joins the choice once 09b lands.
  - Given a request, when it is made, then the files are built in the background with the same contents as S1-E11-09 (every chapter including drafts, the dates and the user ID), the writer gets a notification when they are ready and the link needs sign-in and stops working after seven days.
  - Given a suspended writer, when they ask, then they can still download (S1-E10-06).
  - Given repeated requests, when a writer asks again for the same stories within 24 hours, then the earlier files are offered instead of new ones (proposal).
- **Legal and compliance:** the machine-readable copy in S1-E13-02 is what GDPR Art 20 requires; this is a convenience on top. The user ID in the files is the writer's own personal data and is shown only to them. 13 to 15-year-olds can use it on their own (decided 16 Oct 2026, late evening, Q27).

---
