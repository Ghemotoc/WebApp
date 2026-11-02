<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_


Follows up #72 and #73 (both closed by parts a and b).

Bundle 10 FORUMS-2, part c: banner pictures, notifications for joining a space, and the forum search's filter by space (S1-E8-06, S1-E8-07 and S1-E8-10).

## What changed
- **Banner pictures (S1-E8-06: "an optional banner").** A new "Banner picture" card on the space's settings, for whoever holds the settings power, while picture uploads are on:
  - the picture is prepared (location data out, made smaller), uploaded to a private `space-banners` bucket under the space's ID and checked like every other picture (rule 19);
  - it shows across the top of the space only once it passed; until then everyone sees the space's colour, and the card shows the uploader a preview and where the check is;
  - "Use the colour instead" takes it off and deletes the file, unless moderators still need it;
  - every change is in the space's moderation log ("changed the banner picture").
- **Join notifications (board 5.3: "You'll get a notification when you're in").**
  - A request to join tells the owner and moderators with the members power: "ana and 2 others asked to join …", one row per space per day, with "See the requests", which opens the space at Requests to join.
  - Being let in tells the person "you're in …", with no name of who let them in. A no sends nothing.
  - Both sit under Follows and send no email. A database trigger sends them, so the join functions are unchanged.
- **Search by space (S1-E8-10).** The forum search's Forum drop-down lists the spaces the reader may see as "Space: <name>", after the forums.
- **Staff forum tools leave space forums alone.** A trigger refuses to move, pin, restyle or remove a space's hidden forum. These forums never appear in the staff list, so this is a backstop.
- **Lock hint.** In a space, the reason's hint now says it goes in the space's moderation log (it said "audit log").
- **Docs:** `docs/code-tour.md`, the spaces README and `docs/board-fixes.md`.

## How it was tested
- `supabase/tests/database/229-space-banners-and-notifications.test.sql` (33 tests) covers:
  - each new storage policy allowed and denied (upload with the settings power, reading before and after the check, deleting the replaced file but not the live one);
  - the uploads switch, the settings power for a moderator, "not yours", and the log line;
  - the grouped request notification for the owner and a members-power moderator, the approval with no actor, nothing for a no, the Follows category and no user ID;
  - the space forum guard.
- Unit: notification words and links for both kinds; the space options in the search filter.
- `e2e/space-banners-and-notifications.spec.ts`:
  - blocker asks to join; the owner's notification opens Requests to join; after approval blocker is told they are in;
  - the owner uploads a banner, it passes the stub check and shows; "Use the colour instead" removes it and its file;
  - the search filter keeps a chosen space;
  - axe on the settings page with the new card at 390, 768 and 1440 px, light and night, ro and en, with the doodle overlap check.

## Local check run
LOCALRUN

## By hand
- Nothing. The bucket comes from the migration, and there is no seed change.

## Board mismatches
Each is also in `docs/board-fixes.md`:
- The board draws "Upload a picture" inside the banner choice; it is its own card under the settings form, because a picture is checked first and needs its own messages.
- The space cards on /spaces and the forum index keep the colour and badge; only the space's own page shows the picture.

## Questions for Robert (built as proposals)
- **Declined requests send nothing.** The person sees "Ask to join" again on the space. Tell me if you want a gentle "not this time" notification instead.
- **Under-16 owner who turns 16 (OPEN, from the story).** Still nothing built: they stay the owner.

## Follow-ups
- A banner picture that moderators remove shows in the queue as "Picture (space_banner)"; the summary could name the space.
- Part d: signatures (S1-E8-08). Part e: ranks (S1-E8-09) and the full test run.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
