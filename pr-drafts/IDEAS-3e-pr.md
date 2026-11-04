<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Bundle 14d IDEAS-3, part e of 6: handing a space over. This is idea 7 from the 2 November list, which Robert approved on 2 Nov 2026 at 22:01. On 4 Nov 2026 at 12:53 Robert decided that a space's owner may change, but only through a hand-over the new owner accepts. The idea has no story issue. With this part, every part of 14d is done.

## What changed

- **Offering the space (owner).**
  - Space settings has a new "Hand over this space" card, for the owner only.
  - The owner picks one of the space's moderators and presses "Offer the space". Nothing changes yet.
  - The moderator must be in the space's age group. A class can only go to a teacher with the Teacher badge.
  - While the offer is open, the card says to whom and since when, with "Take back the offer".
- **Answering the offer (moderator).**
  - The moderator gets a notification, and sees the offer at the top of the space with "Accept and become the owner" and "Decline". Nobody else sees it.
  - Accepting makes them the owner, and the old owner stays on as a moderator with every power (criterion 1).
- **The log (criterion 2).** Each step goes in the space's log: offered, taken back, declined and accepted. Each line says who did it, to whom and when.
- **The owner column (architecture 1.6).**
  - `spaces.user_id` used to be refused any change. It is now guarded by `refuse_space_owner_change()`, which allows one change only: an accepted hand-over, to the person the offer was for.
  - A direct update is still refused, even while an offer is open.
  - The decision is recorded in `docs/decisions.md`, and architecture 1.6 notes the exception.
- **Database changes:**
  - New columns `spaces.handover_to_user_id` and `spaces.handover_offered_at`.
  - New functions `offer_space_handover()`, `cancel_space_handover()` and `answer_space_handover()`, plus the internal `space_handover_refusal()`, `space_handover_json()`, `space_for_handover_answer()` and `refuse_space_owner_change()`.
  - `space_viewer_json()` gains `can_hand_over` and `handover`.
  - New notification kind `space_handover_offered`, under Follows.
  - No new table and no new policy.
- `docs/code-tour.md` and the spaces README have a section on this part.

## Tests

- `supabase/tests/database/289-space-handover.test.sql` (19 tests) covers:
  - the offer, the notification, and who sees it;
  - refusing a plain member, and refusing someone else's accept;
  - declining, taking the offer back, and accepting with the new roles;
  - the log lines, newest first;
  - refusing a direct owner change, and a change to anyone but the person offered;
  - the teacher and age-group rules.
- Vitest: the notification's words and link.
- `e2e/space-handover.spec.ts` covers:
  - the owner offering;
  - the moderator accepting and becoming the owner, with the old owner a moderator with every power;
  - the log;
  - axe on the space with the offer at 390, 768 and 1440 px, light and night, ro and en.

## Local check run

Fast checks, run locally on this branch (GitHub Actions is blocked by billing):

- Lint, Prettier, `tsc -b`, `types:check`, `i18n:check` and `migrations:check`: passed.
- Vitest: 234 files, 1,469 tests passed.
- Database (`supabase test db`): 199 files, 4,570 tests passed, including the new `289-space-handover` (19 tests).
- Wrangler compile, the build with and without env, and `third-party:check`: passed.
- e2e (space-handover, spaces, space-moderators, joining-spaces, space-banners-and-notifications): 81 of 81 passed.
- The first run caught two things, both fixed in this commit:
  - test 228's expected viewer now has `can_hand_over` and `handover`;
  - the spec's set-up named a banner colour that doesn't exist.

## By hand

Nothing.

## Follow-ups

None.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
