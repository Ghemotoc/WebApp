<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_


Part of #106

Bundle 12 ADMIN-2, part b1: staff open and change a story (S1-E11-08, part 08a; screen 8.11). Part b2 adds the version history with Restore, removing a passage and hiding a title or cover.

## What changed
- **Who can find it (criteria 2 and 3).** Owner, admin and moderator can set a story to Shown, Restricted or Hidden on its staff page, and hide one chapter or show it again. Hidden: only the writer and staff see it. Restricted (a proposal, see Questions): it still opens from its link, in libraries and on the writer's profile, but Discover, shelves, search and tags leave it out. A story or chapter a moderation case removed can't be brought back here.
- **Settings and details (criteria 2 to 4).** Staff can change the rating, ongoing or completed, comments, category, language, the fan fiction, parody and abuse labels, and the tags. The database runs the writer's own checks, so staff can't save a story the writer couldn't (abuse still needs 16+ and the writer's content note). The title, blurb, content note and chapter text are never sent or changed (Q14).
- **A reason every time.** Each change needs a reason from a list (wrong rating, wrong detail, community guidelines, illegal content, someone's personal data, copyright, the writer asked, something else) plus a few words the writer reads.
- **The writer is told.** Hiding, restricting or raising the rating sends a statement of reasons (DSA art. 17), with the ground in law for illegal content, personal data and copyright. Anything else sends a new "story_changed_by_staff" notification saying what changed and quoting why, never naming the staff member, linking to the story's settings.
- **Versions and the audit log.** Every change writes a `story_revisions` row (who, when, reason, only the changed fields before and after) and an audit log entry carrying the owner's user ID.
- **Stories list.** "Restricted" is a new status and filter chip. The story page also shows the writer's age group ("under 18" or "18 or over"), never an age.
- **Database.** Two migrations: the notification kind, then `story_revisions` and `story_restrictions` (both staff tables with RLS and explicit grants), `is_story_restricted()`, the three `admin_*` change functions with internal helpers, and updated `listed_stories()`, `notify()`, `notification_category()`, `notification_json()`, `admin_story_overview()` and `admin_story_status()`.

## How it was tested
- Database test `239-staff-change-a-story.test.sql` (49 checks): support, the content editor and a writer are refused; a missing or unknown reason is refused; a corrected category is saved, versioned, audited with the owner's ID and notified with what and why, without the staff member; tags and comments change together; a title in the changes is ignored; the writer's label rules apply; a raised rating sends a statement; restricting leaves the lists but the story still opens and the writer still sees it; hiding ends the restriction and closes the story to readers; showing it again notifies; a chapter hidden with personal data as a ground in law; a removed story is refused; allowed and denied tests for all three policies. `021` lists the two tables.
- Unit tests: `staffStorySettingsDiff.test.ts` (only changed fields, tag order, typed tags, reasons) and two new notification text tests.
- Browser test `e2e/staff-story-changes.spec.ts`: a moderator corrects a category (first stopped without a reason) and teen_17 finds the notification with the reason; a moderator restricts a story, shows it again and hides a chapter; support sees no controls; axe and no sideways scrolling at 390, 768 and 1440 px in both themes and languages (15 tests). `staff-stories.spec.ts` still passes (26).
- Screenshots at 1440 and 390 px checked by eye.

## Local check run
LOCALRUN

GitHub Actions is blocked by billing, so this pull request is merged on local checks and Cloudflare's build (Robert's choice, 2 Nov 2026, 15:20 UTC).

## By hand
Nothing: no SQL top-up and no new secrets.

## Board mismatches
- AdminStory (8.11) shows the cover at the top. It comes with part b2, together with hiding a cover, so the page stays plain for now.

## Questions for Robert
- What "restricted" means isn't defined in the story, so this is a proposal: the story stays readable from its link, in libraries and on the writer's profile, but Discover, shelves, search and tag lists leave it out. Say if you'd like it to work differently.
- Staff can lower a rating as well as raise it (a writer may pick 16+ by mistake). Lowering sends a notification, not a statement. Say if lowering should be refused.

## Follow-ups
- A moderation case's "Restrict" decision still waits: it can now reuse `story_restrictions` for stories.
- The `story_changed_by_staff` notification is in the app only; an email for it can follow with the email templates.
- Rank badges (`story_tag_ranks`, writer ranks) still count a restricted story.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
