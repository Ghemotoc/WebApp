> Source: CTO pack, fact-checked 17 Oct 2026. The master plan's Decisions made tab wins if they differ.

#### S1-E7 Notifications

**Back end and build order:** section 1.7, group F (screen 6.2), wave 4.

##### S1-E7-01 In-app notifications

As a user, I want a notifications list so that I see new chapters, replies and moderation decisions.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E6-01, S1-E6-05
- **Acceptance criteria:**
  - Given a followed writer publishes, when the chapter goes live, then followers get a notification.
  - Given several reactions on one comment, when they arrive within an hour (proposal), then they are grouped into one notification.
  - Given the bell icon, when there are unread items, then a badge shows the count and "Mark all as read" clears it.
  - Given a moderation decision about the user's content, when it is made, then it arrives as a notification that cannot be switched off.
- **Legal and compliance:** statements of reasons must reach the user (DSA Art 17).

##### S1-E7-02 Email notifications and digests

As a user, I want to choose which emails I get so that my inbox stays calm.

- **Priority:** Should · **Size:** M · **Depends on:** S1-E7-01
- **Acceptance criteria:**
  - Given notification settings, when the user opens them, then each type can be set to instant, daily digest or off, except account and legal emails.
  - Given any non-essential email, when it is sent, then it has a one-click unsubscribe link and header.
  - Given an under-18 user, when emails are sent, then no marketing or promotional emails are sent to them.
- **Legal and compliance:** marketing emails need consent (Romanian Law 506/2004). No marketing email to under-18s (decided 16 Oct 2026, late evening, Q50).

##### S1-E7-03 Push notifications in the apps

As an app user, I want push notifications for new chapters and replies so that I don't miss them.

- **Priority:** Should · **Size:** M · **Depends on:** S1-E7-01, S1-E16-03
- **Acceptance criteria:**
  - Given a new install, when the app first opens, then it does not ask for push permission until the user follows someone or comments.
  - Given an under-18 user, when it is between 22:00 and 07:00 in their time zone (canvas 6.3; Q50 decided quiet hours, not the times), then push notifications wait until 07:00.
  - Given notification settings, when push is switched off for a type, then no push of that type is sent.
- **Legal and compliance:** default quiet hours for minors (decided 16 Oct 2026, late evening, Q50), in the spirit of DSA Art 28.

##### S1-E7-QA Epic check: Notifications

As the founder, I want every story in this epic tested together end to end so that the pieces work with each other, not just alone.

- **Priority:** Must · **Size:** S · **Depends on:** S1-E7-01
- **Added:** 17 Oct 2026, 12:36 (Robert, chat): every epic ends with a quality-check story, and every prompt has a quality check built in. It covers the epic's March MVP stories and comes last among them in the build order. The epic's after-March stories (S1-E7-02, S1-E7-03) get the same check when they land (proposal).
- **Main journeys:** a follow, a comment and a new chapter each notify the right person in the app, and nobody is notified about a person they blocked.
- **Acceptance criteria:**
  - Given the epic's stories are merged, when the end-to-end suite runs, then Playwright tests walk the main journeys across those stories with the seed personas `adult_writer`, `teen_17`, `kid_14_ok` and `kid_14_waiting`, and every journey passes.
  - Given a journey breaks where two stories meet, when it is found, then it is fixed in this pull request or ticketed as a GitHub issue that names the stories involved.
  - Given every screen in the epic, when axe runs at 390, 768 and 1440 px wide, then it reports no serious or critical issues.
  - Given the RLS tests, when they run as one suite (`npx supabase test db`), then every policy on every table the epic touches has an allowed and a denied test, with no gaps.
  - Given `docs/code-tour.md`, when it is read, then it covers the epic: where its screens, hooks, tables, functions and jobs live and how one main journey travels through them.
  - Given the check is finished, when the pull request is opened, then it includes a short epic report listing what works, the known gaps and every stub or mock still on (with the story that removes it, `docs/mocks.md`).
- **Legal and compliance:** minors' journeys are tested with the under-16 (`kid_14_ok`, `kid_14_waiting`) and 16 to 17 (`teen_17`) personas, so the age gate, ratings, blocks and under-18 defaults are proved across stories, not only inside each one. In March only invited adults sign up (`adults_only`, decided 17 Oct 2026, 12:44), so the minor personas are seed data that prove these protections are ready before minors are let in. The test data is the seed personas only, never real user data (CLAUDE.md, Safety while building).

---
