<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_


Closes #106

Bundle 12 ADMIN-2, part b3: staff hide a story's title or cover, and the staff story page shows the cover (S1-E11-08; screen 8.11). This is the last part of S1-E11-08.

## What changed
- **The cover on the staff page (criterion 1).** The page now shows the story's real cover: drawn, automatic or the uploaded picture. Staff always see the real one, with a pill while it is hidden from readers.
- **Hide the title (criterion "hide the title").** Under "Title and cover", owner, admin and moderator can hide the title with a reason. Readers then see "Titlu ascuns de echipa de moderare" or "Title hidden by the moderation team" (in the story's language, from a new setting) everywhere a title shows: cards, shelves, Discover, the story page, the reader, link previews, profiles, a reader's library export, the public Atlas page and notifications. A hidden title isn't found by search. The writer's own title never changes and staff never write a new one.
- **Hide the cover (criterion "hide the cover").** Readers see the automatic cover instead. A hidden uploaded picture is held back from readers in the app and in Storage. A story that already has the automatic cover has nothing to hide.
- **Until the writer changes it.** When the writer changes the title or picks another cover, it shows again on its own. Staff can also show it again with a reason.
- **The writer is told.** Hiding sends a statement of reasons with two new actions, "We hid your story's title" and "We hid your story's cover", saying the story is still there to read. Showing again sends a notification. Both are versions in the history ("Title: shown → hidden"), go in the audit log with the owner's user ID, and Restore undoes them.
- **Database.** Two migrations: the two statement actions, then the columns, the trigger, the marker setting, `story_as_shown()` (the one place that masks a story for readers), the rewritten public reads, the `presentation` change kind, `admin_set_story_presentation()`, the Restore branch and the overview fields.

## How it was tested
- Database test `241-hide-title-and-cover.test.sql` (37 checks): support, the editor and a writer are refused; a reason is needed; only the title or cover; nothing to hide on an automatic cover; nothing changed is refused; the version, statement (`title_hidden`, `cover_hidden`) and audit log; a reader sees the marker on the card, story page, lists, reader and a visitor's link preview; search misses a hidden title; the writer and staff see the real title; showing again sends a notification and no statement; Restore hides it again; changing the title or cover shows it again; a reader gets the automatic cover; allowed and denied for `picture_is_visible()` (policy `pictures_select_visible`); the overview has the cover.
- Unit tests: how a `presentation` version reads, and the "shown again" notification lines.
- Browser test `e2e/staff-story-presentation.spec.ts`: a moderator hides the title, a reader sees the Romanian marker and never the title; the cover is hidden; the history lists both; showing the title again brings it back for the reader; support sees the cover and history with no controls; axe and no sideways scrolling at 390, 768 and 1440 px in both themes and languages. `staff-story-changes`, `staff-story-history`, `staff-stories`, `chapter-reader` and `notifications` still pass.
- Screenshots of the staff page and the reader's story page at 1440 and 390 px checked by eye.

## Local check run
LOCALRUN

GitHub Actions is blocked by billing, so this pull request is merged on local checks and Cloudflare's build (Robert's choice, 2 Nov 2026, 15:20 UTC).

## By hand
Nothing: the marker setting arrives with the migration, with no SQL top-up and no new secrets.

## Board mismatches
- AdminStory (8.11) shows the cover but no hide controls; "Title and cover" follows the page's plain staff style.

## Questions for Robert
- Staff browsing the public site see the real title and cover of a story they hid (as they see a hidden story). Say if you'd rather they see what readers see outside the admin site.

## Follow-ups
- The writer's own story settings could show a note while the title or cover is hidden; today they learn it from the statement of reasons.
- An overturned appeal doesn't unhide a title or cover on its own (story changes have no case yet, as in parts b1 and b2); staff use Restore or Show again.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
