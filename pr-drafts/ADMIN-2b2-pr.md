<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_


Part of #106

Bundle 12 ADMIN-2, part b2: a story's version history, Restore and removing a passage (S1-E11-08, part 08b; screen 8.11). Part b3 adds hiding a title or cover and the cover on the staff page, and closes the issue.

## What changed
- **Version history (criteria 1 and "a new version is stored").** The staff story page lists every staff change, newest first: when, which staff member, what changed with before and after values, the reason, and for a restore which change it undid. Support staff see it too, read-only.
- **Restore (criterion "Restore").** Owner, admin and moderator can press "Restore what this replaced" on any version. It brings back the values from before that change (earlier settings, how visible the story or a chapter was, or a removed passage's words) as a new version with its own reason, and the writer is told: a statement of reasons when Restore restricts content, a notification otherwise. The writer's own checks still apply.
- **Removing a passage (criteria "remove the exact passage" and "staff can't type").** Under each published chapter, "Remove a passage" opens the chapter's published words in a read-only field: staff select the exact words with the mouse or Shift and the arrows, check the quote, give a reason and, if they like, a case reference. The marker replaces only those words, in the story's language ("[Eliminat de echipa de moderare]" or "[Removed by the moderation team]", from a new setting). The draft loses the words too, so publishing can't bring them back, and its version goes up so an open editor doesn't save over the change. If the same words appear twice, the copy staff selected is the one cut; if the writer changed them since, the server refuses. The writer gets a statement of reasons.
- **The original words (criterion "the original stays").** They go into a new staff table, `removed_passages`, never into the version (which support can read). Only owner, admin and moderator can read them, a passage removed for a safeguarding case only with the safeguarding permission, and every read goes into the audit log.
- **Notification.** A passage put back by Restore tells the writer which chapter.
- **Database.** One migration: the `passage` change kind and `restores_revision_id` on `story_revisions`, the marker setting, `removed_passages` (RLS, explicit grant), and the functions `admin_chapter_text()`, `admin_remove_chapter_passage()`, `admin_restore_story_revision()`, `admin_removed_passage()` with internal helpers; `admin_story_overview()` now carries the history.

## How it was tested
- Database test `240-story-history-and-passages.test.sql` (46 checks): only owner, admin and moderator read a chapter's words, never a draft's; support, the editor and a writer can't remove; no reason, unknown words, an unknown case or an unpublished chapter are refused; the cut leaves the rest untouched, uses the story's language and updates the draft and its version; the version carries no words; the statement says removed, on the law; the audit log has the owner's ID; the second copy of repeated words is cut; reading the original is logged; allowed and denied tests for `removed_passages_select_staff`, including a safeguarding passage hidden from an admin without the permission; Restore puts a passage back, refuses a rewritten chapter and a second put-back, brings back a category, shows a hidden story, hides it again with a statement and shows a hidden chapter; the history is newest first, never has the words, and support sees it. `021` lists the new table; `239` still passes.
- Unit tests: `storyVersionText.test.ts` (how versions read, Restore offered or not, the selected copy) and a notification text test.
- Browser test `e2e/staff-story-history.spec.ts`: a moderator selects and removes an address, readers see the Romanian marker, the history counts 14 characters and shows the words on request, Restore brings them back for readers; support sees the history with no controls; axe and no sideways scrolling at 390, 768 and 1440 px in both themes and languages. `staff-story-changes.spec.ts` and `notifications.spec.ts` still pass.
- Screenshots at 1440 and 390 px checked by eye.

## Local check run
LOCALRUN

GitHub Actions is blocked by billing, so this pull request is merged on local checks and Cloudflare's build (Robert's choice, 2 Nov 2026, 15:20 UTC).

## By hand
Nothing: the marker setting arrives with the migration, with no SQL top-up and no new secrets.

## Board mismatches
- AdminStory (8.11) shows a version list but no "Remove a passage" panel; the panel follows the page's plain staff style. The cover still comes with part b3.

## Questions for Robert
- How long the original of a removed passage is kept is OPEN in the story. Proposal there: with its case, then deleted. Nothing deletes it yet; say the period you want and a clean-up job can follow.
- "Staff working on that case" is read as owner, admin and moderator (plus the safeguarding permission for a safeguarding case), since cases aren't assigned to one person yet. Say if it should be narrower.
- Restore brings back what one change replaced, rather than rolling the whole story back to a date. Say if you'd prefer the second.

## Follow-ups
- The writer's own chapter history (`chapter_revisions`) still holds the removed words; only the writer can read it. Clearing it there could follow if the lawyer asks.
- A moderation case page could link straight to the story page with the case reference filled in.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
