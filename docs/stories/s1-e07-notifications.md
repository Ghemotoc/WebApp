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

---
