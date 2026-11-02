<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_


Closes #73

Bundle 10 FORUMS-2, part b: space moderators (S1-E8-07).

## What changed
- **Moderators and their powers (criterion 1).** On the space's settings page, a new Moderators card lets the owner:
  - add a member as a moderator by username;
  - tick what they can do: **threads** (make sticky and lock, in that space only), **members** (answer requests to join, see the member list, remove members) and **settings** (name, description, rules, who can post or join);
  - change those powers, or take them away ("Remove as moderator"), which keeps the person in the space.
  Only a member of the space, in its age group, can be made a moderator. Only the owner and our moderation team can appoint or remove moderators, and moderators can't remove each other.
- **"Who runs it"** now lists the moderators with their powers ("Moderator: threads and members"). A moderator sees "You help moderate this space." and links to what their powers allow.
- **Members page** at `/spaces/<name>/members`: the owner, then moderators, then members, each with "Remove" where the reader may use it. Removing asks for an optional reason (kept in the log) and a "Yes, remove" step.
- **Moderation log (criterion 2)** at `/spaces/<name>/log`: every appointment, change, removal, request answer, settings change, sticky and lock, newest first, 50 at a time. The owner and our moderation team read it; moderators don't. Our team shows as "The moderation team", never by name.
- **Platform override (criterion 3).** Our moderation staff hold every power in every space without being members. Their actions go in the space's log and also in the audit log.
- **Database:**
  - `space_members` gains role `moderator` and a `powers` list;
  - new table `space_moderation_log` (RLS, one select policy for the owner and staff, explicit grants);
  - one rule for every check, `space_may_act(space, power)`;
  - the existing sticky and lock functions now also let in a space moderator with the threads power on a thread in their space; `can_moderate` on a thread says so too.
- **Data rights:** the log is in Download my data. When a moderator deletes their account, their log lines stay while the space exists, shown as a deleted account.
- **Docs:** `docs/code-tour.md`, the spaces README and `docs/board-fixes.md`.

## How it was tested
- `supabase/tests/database/228-space-moderators.test.sql` (38 tests) covers:
  - appointing, changing and removing;
  - refusals for a non-member, the owner and someone outside the age group;
  - each power allowed and denied, including pin and lock inside the space but not outside it;
  - moderators unable to appoint, read the log or remove each other;
  - the log's policy allowed and denied;
  - the platform override, with the audit log row and no staff name;
  - no user ID in the moderators list.
- Test 227 now expects the new "not allowed" answer for requests. Test 021 counts the new table.
- Unit: `src/features/spaces/api/spaceModeration.test.ts` (powers, refusals, log lines, checkboxes).
- `e2e/space-moderators.spec.ts`:
  - the owner appoints teacher with two powers;
  - teacher removes a member with a reason and isn't offered the owner, the log or the settings;
  - the owner reads both lines and the reason in the log;
  - axe on the settings, members and log pages at 390, 768 and 1440 px, light and night, ro and en, with the doodle overlap check.
- I also checked screenshots of the space, settings, members and log pages at 1440 and 390 px.

## Local check run
LOCALRUN

## By hand
- Nothing. No seed change, so there is no staging top-up.

## Board mismatches
Each is also in `docs/board-fixes.md`:
- The board's "Moderators (optional)" field on the create form is a Moderators card on the settings page instead, because a new space has no members to choose from yet.
- Space moderators can make threads sticky and lock them, but not hide or move posts. Reports in a space still go to our moderation team.
- The "mail" power is in the database but not offered yet; it waits for moderator mail in spaces.

## Questions for Robert (OPEN or not in the story, built as proposals)
- **OPEN, from the story: an under-16 space's owner who turns 16.** Still nothing built: they stay the owner. Now that moderators exist, one option is to hand the space to its longest-serving under-16 moderator. Shall I build that in part c?
- **Who reads the log:** the owner and our moderation team only, as the story says. Moderators can't read it, even with every power.
- **Removed members can ask to join again.** Removing isn't a ban. A space-level ban would be a new story if you want one.
- **A moderator's lock** shows "Locked by the moderation team", the same words as a staff lock, so the thread never names who locked it.

## Follow-ups
- Part c: notifications for join requests and answers, banner pictures with the picture check, the forum search's "filter by space", and refusing `admin_save_forum()` and `admin_delete_forum()` on a space's forum.
- The lock form's hint says the reason "goes in the audit log". In a space it goes in the space's log; I'll fix the wording in part c.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
