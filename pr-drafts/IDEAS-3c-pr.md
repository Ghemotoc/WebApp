<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Bundle 14d IDEAS-3, part c of 6: the class link as the invitation. This is idea 4 from the 2 November list, which Robert approved on 2 Nov 2026 at 22:01. The idea has no story issue.

## What changed

- **A working class code now opens invite-only sign-up.**
  - A signed-out student on the class link (`/class/<code>`) gets "Create an account with this code". It opens sign-up at `/join/<code>`, with no second invitation needed.
  - The new account is an active member of the class as soon as it is made.
  - The join is logged twice: as "member joined" in the class's log, and as `invite.redeemed` (purpose `class_space`) in the audit log.
  - The code's place is counted and checked in one statement, as for platform invites.
- **A code that no longer works doesn't open sign-up.**
  - This covers a code that has ended or is used up, and the code of a locked or removed class.
  - The sign-up page then asks for a normal invitation, and a refused sign-up leaves no account.
- **When sign-up is open** (`invite_only` off), the page says to make an account and open the link again.
- **What stays the same:**
  - Platform invites work as before.
  - Every other sign-up rule still runs first: age, market, username and terms. While `adults_only` is on, only adults can sign up.
  - The idea noted that minors joining this way needs the age check and parental consent on. Both are already enforced by the account gate after sign-up, as for any class member.
- **Database changes:**
  - `check_invite()` now also answers for class codes.
  - New internal functions `class_invite_opens_sign_up()` and `use_sign_up_invite()`.
  - `create_profile_from_sign_up()` calls `use_sign_up_invite()` at step 5.
  - There is no new table, column or policy.
- `docs/code-tour.md` has a section on this part.

## Tests

- `supabase/tests/database/286-class-link-sign-up.test.sql` (12 tests) covers:
  - a class code being valid, and signing up with it joining the class with both log rows;
  - a used-up code and a locked class's code being refused with no account left behind;
  - unknown codes;
  - platform invites as before.
- `e2e/class-link-sign-up.spec.ts` covers:
  - signing up from the class link and being in the class;
  - a used-up code asking for a normal invitation;
  - axe on the signed-out Join a class page at 390, 768 and 1440 px, light and night, ro and en.

## Local check run

Fast checks, run locally on this branch (GitHub Actions is blocked by billing):

- Lint, Prettier, `tsc -b`, `types:check`, `i18n:check` and `migrations:check`: passed.
- Vitest: 232 files, 1,459 tests passed.
- Database (`supabase test db`): 196 files, 4,516 tests passed, including the new `286-class-link-sign-up` (12 tests).
- Wrangler compile, the build with and without env, and `third-party:check`: passed.
- e2e (class-link-sign-up, invite-links, sign-up, class-spaces, class-tools): 71 of 71 passed.

## By hand

Nothing.

## Follow-ups

None.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
