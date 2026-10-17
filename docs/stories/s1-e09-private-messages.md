> Source: CTO pack, fact-checked 17 Oct 2026. The master plan's Decisions made tab wins if they differ.

#### S1-E9 Private messages

**Back end and build order:** section 1.7, group E (screen 5.5), after the March slice.

Decided: private messages are in Stage 1 with block and report built in. Decided 16 Oct 2026 (Q6 and Q13, replacing that day's earlier "by default" rule): messaging is never possible between under-16s and adults, not even teachers, and a 16 or 17-year-old chooses for themselves whether adults can message them, off by default. Decided 17 Oct 2026 (canvas comment): adults never learn anyone's age; they see only the neutral "<name> isn't taking messages right now" (S1-E9-03). Still OPEN: whether teachers' posts in class threads count. Anyone can block someone from their profile or from a conversation. Private messages come after the March MVP (section 1.13).

##### S1-E9-01 One-to-one private messages

As a user, I want to send private messages so that I can talk to other writers and readers directly.

- **Priority:** Must · **Size:** L · **Depends on:** S1-E5-05, S1-E9-03
- **Acceptance criteria:**
  - Given a profile, when the user taps "Message", then a conversation opens if the recipient's settings and the age rules allow it.
  - Given the recipient doesn't follow the sender, when a first message arrives, then it lands in "Message requests" and the sender can't send more until it is accepted.
  - Given a new account, when it starts new conversations, then no special new-account limit applies (decided 16 Oct 2026, late evening, Q61, replacing the earlier new-account limit); the general spam limits in S1-E10-12 still apply.
  - Given a message, when it is sent, then it is text only (images in messages are OPEN; proposal: off).
- **Legal and compliance:** messages are not end-to-end encrypted, because reported messages must be reviewable; the privacy notice must say staff read messages only when they are reported or required by law.

##### S1-E9-02 Block and report inside messages

As a user, I want to block or report someone from a conversation so that I can stop unwanted contact at once.

- **Priority:** Must · **Size:** S · **Depends on:** S1-E9-01, S1-E10-01
- **Acceptance criteria:**
  - Given a conversation, when the user blocks the other person, then neither can message, mention or follow the other and the blocked person is not told.
  - Given a reported message, when the report is sent, then it includes that message and up to the 20 previous messages as context (canvas 5.5), and the reporter sees a confirmation.
- **Legal and compliance:** Apple guideline 1.2 and Google Play's user-content policy require blocking and reporting.

##### S1-E9-03 Adult and minor messaging rules

As a parent or young writer, I want adults kept out of minors' inboxes by default so that young users are safer.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E2-02, S1-E2-08
- **Acceptance criteria:**
  - Given a 16 or 17-year-old, when their account is created, then "Let adults message me" is off; only the teen can switch it on or off in Settings, never a parent, staff or the adult (decided 16 Oct 2026, late evening, Q13).
  - Given that switch is off, when an 18+ account tries to message the 16 or 17-year-old, then the Message button is not shown and the API refuses; when it is on, the adult can send a message request (S1-E9-01).
  - Given an under-16 account, when any 18+ account (teachers included) tries to message it, or it tries to message an 18+ account, then it is blocked in both directions and no setting can turn it on (Robert, 16 Oct 2026).
  - Given an under-18 user, when they message another under-18 user, then normal rules apply.
  - Given an adult cannot message someone because of these age rules, when they open that person's profile or a chat, then they see only the neutral note "<name> isn't taking messages right now", the same note anyone sees when a person has turned messages off; no screen, error or API message tells them the other person's age or age band (Robert, canvas comment, 17 Oct 2026).
  - Given a user turns 18 by year of birth and has an "18 or over" age check result, when the nightly job runs, then existing conversations continue and the new rules apply to new ones.
- **Legal and compliance:** decided 16 Oct 2026 (Q6, Q13): messaging is never possible between under-16s and adults, not even teachers; for 16 and 17-year-olds it is off by default and only the teen can turn it on. OPEN: whether teachers' posts in class threads count. DSA Art 28 and the DPIA for minors apply; the UK's announced under-16 stranger-contact restriction points the same way.

##### S1-E9-04 Message settings and retention

As a user, I want to control who can message me and how long messages stay so that I feel in control.

- **Priority:** Should · **Size:** S · **Depends on:** S1-E9-01
- **Acceptance criteria:**
  - Given message settings, when the user opens them, then they choose everyone, people I follow or nobody (default for under-18: people I follow, proposal); 16 and 17-year-olds also see "Let adults message me" (off by default, S1-E9-03).
  - Given both people delete a conversation, when the cleanup job runs, then the messages are permanently deleted.
  - Given reported messages, when the case closes, then they are kept for the retention period in the retention schedule and then deleted.
- **Legal and compliance:** GDPR Art 5(1)(e) storage limitation.

---
