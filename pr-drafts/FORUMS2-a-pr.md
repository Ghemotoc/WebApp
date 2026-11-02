<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_


Closes #72

Bundle 10 FORUMS-2, part a: spaces people create (S1-E8-06).

## What changed
- **Create a space (criterion 1).** Any fully active account can start a space at `/spaces/new` and becomes its owner. There is no approval step, no minimum account age and no limit beyond the spam limit (a proposal: 2 new spaces an hour for a new account, 10 for an older one). The owner sets:
  - a name, checked as they type ("This name is available." or "Another space has this name.");
  - a description and rules (one rule a line);
  - a banner colour: plum, night blue, forest green or gold;
  - who can post, how people join and, for under-16 spaces, who can read.
  Brand and author names are allowed (Q26).
- **Age groups (criteria 2, 3, 6 and 7).** A space takes the age group of whoever starts it, from `age_band()`: under 16, or 16 and over. Only that group can join or post. A 16+ space can be read by everybody, signed out included. An under-16 space is hidden from everyone outside its group unless its owner made it readable by everybody (34p). A member who turns 16 keeps the spaces they joined, but can't join or start another under-16 space.
- **Joining (criteria 3 and 8).** "Join space" lets the reader in straight away, or sends a request the owner approves or declines from "Requests to join". "Take back request" and "Leave space" undo it. With members-only posting, a non-member sees "Only members can post here" instead of "Start a thread", and the reply box tells them to join.
- **One forum per space.** Every space owns one hidden forum, so its threads are ordinary forum threads at `/forums/space-<name>/<n>`. Quotes, read marks, sticky and locked, search and reporting work in a space with no new code. Space forums stay out of the forum index and Staff › Forums. A trigger on threads and posts refuses anyone the space doesn't take, so no forum write function changed.
- **Screens:**
  - `/spaces`: every space the reader may see, 20 at a time;
  - `/spaces/:name`: board 5.3's header, the threads, the rules and who runs it, plus the owner's requests;
  - `/spaces/:name/new` and `/spaces/:name/settings` (owner only);
  - a Spaces card on the forum index with the four latest spaces, "Create a space" and "See all".
- **Reporting (rule 6).** A space is reportable (`reportable_type` 'space'), with Report on its header. Moderators see the name, description and rules in the case, and a hidden space disappears for everyone but its owner.
- **Data rights.** Leaving or deleting an account removes the person's memberships. A deleted owner's space stays for its members (see the questions). Both tables are in Download my data.
- **Seed and staging:** two spaces, "Fantasy writers’ circle" (16+, owned by adult_writer) and "Young poets" (under 16, owned by kid_14_ok), plus `supabase/staging-topups/FORUMS-2a.sql`.
- **Docs:** `docs/code-tour.md`, the spaces and forums READMEs and `docs/board-fixes.md`.

## How it was tested
- `supabase/tests/database/227-spaces.test.sql` (39 tests) covers:
  - creating, the unique name, the spam limit and an unknown age group;
  - both age groups, turning 16, and reading for visitors, adults and members;
  - joining, approving, declining, leaving and the owner who can't leave;
  - posting in members-only and open spaces;
  - the forum index leaving space forums out, reporting, every policy allowed and denied, and no user ID.
- Tests 021 and 221 now count the new tables and leave space forums out.
- Unit: `src/features/spaces/api/spaces.test.ts`, which covers the answers, the refusals, the badge letters and the forum's space refusals.
- `e2e/spaces.spec.ts` covers:
  - creating a space, with a taken and a free name;
  - asking to join, the owner approving, and the new member starting a thread through the space;
  - a visitor reading a 16+ space but not a members-only under-16 one, and the forum index card;
  - axe on `/spaces`, a space, the create form and the settings at 390, 768 and 1440 px, light and night, ro and en, with the doodle overlap check.

## Local check run
LOCALRUN

## By hand
- On staging, run `supabase/staging-topups/FORUMS-2a.sql` once, in the SQL editor. It adds the two seed spaces and is safe to run twice.

## Board mismatches
Each is also in `docs/board-fixes.md`:
- Not built yet:
  - Share, the ad slot and the Moderators list and field: moderators come in part b (S1-E8-07);
  - "Upload a picture" for the banner: four drawn colours for now, and pictures come in part b with the picture check (rule 19);
  - the Open space or Class space choice: class spaces come with bundle CLASSES.
- Changed wording:
  - "You’ll get a notification when you’re in" is now "You can post once you’re in": join notifications come in part b;
  - the space's "New thread" is "Start a thread", as in every forum.

## Questions for Robert (OPEN or not in the story, built as proposals)
- **OPEN, from the story: when an under-16 space's owner turns 16.** Nothing is built. They stay the owner, as members who turn 16 stay members. The story's proposal (hand it to another under-16 member or a moderator) needs space moderators, so it fits part b if you agree.
- **An owner deletes their account:** the space stays for its members, its owner shown as a deleted account. The alternative is to delete the space with its threads.
- **The age group is shown only inside the group.** Adults never see the "Members: under 16" pill. That way an adult can't search for spaces with children in them.
- **Under-16 spaces start readable by members only.** The owner can switch them to everybody. This is the most private choice first.
- **Spam limits:** 2 new spaces an hour for a new account and 10 for an older one, and 30 or 60 joins an hour. All four are settings.

## Follow-ups
- The forum search's "filter by space" (S1-E8-10) is not built yet. Search already finds space threads the reader may read. I'll add the filter with part b.
- `admin_save_forum()` and `admin_delete_forum()` could still change a space's forum if staff typed its ID. Part b should refuse that.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
