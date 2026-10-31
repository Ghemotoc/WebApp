# MESSAGES-a plan: who may message whom (S1-E9-03)

Branch `claude/messages-a-messaging-rules`. Story: docs/stories/s1-e09-private-messages.md, S1-E9-03. Board: Messages.dc.html ("What an adult sees on your profile").

## Choices

- **One rule in the database:** `can_message(sender, recipient)`, internal (no client may call it directly). Parts b to d (conversations, requests, block and report, settings) call it before a new conversation or request.
- **Age rules (decided 16 Oct 2026, Q6 and Q13):**
  - under-16 and adult: never, either way, whatever any setting says (teachers included);
  - 16 or 17 and adult: only when the teen's "Let adults message me" is on. Proposal: the same rule both ways, so a teen with the switch off can't start a chat an adult then answers in;
  - under-18 with under-18: the normal rules;
  - an unknown age band (no year) counts as under 16 for this rule (safest).
- **Blocks:** a block either way stops it.
- **The recipient's setting:** a new `profiles.messages_from` (everyone, people I follow, nobody). Empty means the default for the age group: people I follow for under-18s (the story's proposal), everyone for adults (proposal). The Settings screen to change it is part d (S1-E9-04); part a only reads it.
- **The sender** must be an active member (`account_state` active); a suspended, banned or not-admitted account can't start one.
- **Neutral answer (Robert, 17 Oct 2026):** the profile gets `can_message` (null signed out or on one's own profile). When false, the profile shows "<name> isn't taking messages right now", the same for age, setting, block or a sender who can't write. Nothing says why.
- **Turning 18:** the band is worked out from the year each time, so new conversations follow the new rules the day it changes; existing conversations continue (part b checks blocks only inside an existing conversation). No job needed.
- The Message button itself comes with part b.

## Files

- `supabase/migrations/…_s1_e9_03_enums.sql`: `message_audience`.
- `supabase/migrations/…_s1_e9_03_messaging_rules.sql`: the column, `message_audience_of()`, `ages_allow_messages()`, `can_message()`, `get_writer_profile()` with `can_message`.
- `supabase/tests/database/205-messaging-rules.test.sql`: every age pairing, the switch, blocks, the three audiences, inactive senders, self, and the neutral profile answer.
- Types regenerated; `writerProfile.ts`, `ProfileHeader.tsx` (+ a `MessagesNote`), people locale ro and en.
- `e2e/messaging-rules.spec.ts`: an adult sees the note on a 14-year-old's and on a 16-year-old's profile (switch off), not once the teen turns it on, and not on another adult's; axe on the profile with the note.
- Docs: code-tour, supabase README, retention (the new column), board-fixes if needed.
