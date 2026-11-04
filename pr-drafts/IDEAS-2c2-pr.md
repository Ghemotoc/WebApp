<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Bundle 14c IDEAS-2, part c2: a kind "No thanks" for message requests, and teens can see what their parent or guardian agreed to (ideas IDEA-20261101-7 and -8, approved on 2 Nov 2026, 22:00). These ideas have no story issue.

## What changed

- **"No thanks" (idea 7):**
  - A message request now has three answers: Accept request, No thanks and Delete request.
  - "No thanks" closes the request. The sender sees one fixed, polite reply in the chat: "Thanks for writing, but I'd rather not chat right now." Their list says "Said no thanks for now".
  - The reply comes from the locale files, never from the person, so it needs no moderation and adds no message.
  - The sender can't send another request for 30 days. After that they may write once more, which opens a new request.
  - "Delete request" is unchanged: the sender isn't told (criterion 2).
- **What a parent or guardian agreed to (idea 8):**
  - A member whose parent or guardian agreed sees a new Settings section: "Your parent or guardian agreed on <date>", with a short list of what that covers (publishing, messages within the age rules, the data we keep, and that it can be withdrawn).
  - After a withdrawal, the notice at the top of every page says so plainly: the account is read-only, and what still works. Its link opens the same Settings section, which lists what they can still do.
  - This uses the consent data that was already there. No new personal data.

## Tests

- The new database test `281-no-thanks` (14 tests): who may say "No thanks"; it closes the request and drops a waiting message email; the sender is told and paused for 30 days; after them a new request opens; "Delete request" still tells nobody.
- The new e2e test `no-thanks-and-consent.spec.ts`: "No thanks" from the recipient's chat and the sender's view; a 14-year-old's Settings before and after a withdrawal, and the notice; axe and no sideways scrolling at 390, 768 and 1440 px.

## Local check run

LOCALRUN

## By hand

Nothing.

## Questions for Robert

None. The fixed reply and all new Romanian text are draft, as always.

## Follow-ups

None.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
