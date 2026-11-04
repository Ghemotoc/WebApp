<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Bundle 14c IDEAS-2, part c1: an email when a private message arrives, with quiet hours (idea IDEA-20261101-6, approved on 2 Nov 2026, 22:00). This idea has no story issue.

## What changed

- **Message emails (new):**
  - Until now a private message never sent an email. Now a message, or a message request, emails the other person once per chat, through the same worker as the notification emails.
  - The email says who wrote and links to the chat. It never holds the words.
  - It waits 5 minutes, so someone chatting in the app gets none. If the chat is read, deleted or blocked before then, nothing is sent.
- **Quiet hours:**
  - Settings › Messages has a new "Emails about messages" block: "Email me when a message arrives" and "Quiet hours: hold these emails until morning", with From and Until.
  - During quiet hours an email waits until they end (criterion 1: a message at 23:00 with 22:00 to 07:00 goes at 07:00).
  - Under 18, quiet hours are on from 21:00 to 07:00 (criterion 2, the idea's proposal). A teen can move them but can't turn them off or make them shorter than 22:00 to 07:00, the quiet hours already decided for push (Q50).
  - Adults start with emails on and quiet hours off.
- The one-click unsubscribe now turns message emails off too.
- The choices are four columns on `profiles`, so they are in Download my data with the rest of the profile.

## Tests

- The new database test `280-message-emails` (20 tests): the defaults for each age group; one held email per chat; the worker waits, then sends one line naming the sender without the words; a chat read in time sends nothing; the quiet hours sum (23:00 waits to 07:00); the under-18 limits; emails off; the unsubscribe.
- `server/notification-emails.test.ts`: the message email in English and a message request in Romanian, with the link to the chat and the Messages settings link.
- The new e2e test `message-emails.spec.ts`: an adult saves quiet hours and a message is then held; a teen can't untick quiet hours and a 23:00 start is refused in plain words; axe and no sideways scrolling at 390, 768 and 1440 px.

## Local check run

LOCALRUN

## By hand

Nothing. Message emails leave through the notification email worker, which is already on the GO-LIVE list.

## Questions for Robert

None needed to merge. Three choices I made, all easy to change:
- Message emails are on by default for everyone. Say if you'd rather they start off.
- Quiet hours use Romanian time, because profiles hold no time zone yet. A per-person time zone fits better once other countries open.
- The new Romanian text is draft, as always.

## Follow-ups

- A per-person time zone for quiet hours, before the first market outside Romania opens.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
