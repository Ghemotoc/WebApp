<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_


Part of #77

Bundle 11 CLASSES, part c: a student can share a story only with their class, and the class page lists the stories shared with it (S1-E8-11). Part d is the staff pilot set-up and archiving; part e is certificates (S1-E8-12) and the forums epic check.

## What changed
- **"Who can read it" in Story settings.**
  - A writer who is in a class (and the class isn't locked) picks the class and presses "Share only with this class".
  - From then on only the writer, the class's fully active members and our moderation team can read it.
  - "Make it public" brings it back to everyone, within its rating.
  - Only the writer can do either. A teacher can never make a student's story public.
  - The card doesn't show for writers who aren't in a class.
- **Where a class story never appears.** While shared, the story stays out of:
  - every public list, even for classmates;
  - the writer's public profile;
  - new-chapter notices to followers outside the class, so they never learn its title.
  - A visitor or an adult outside the class gets "not found" for its page and chapters.
- **On the class page.** "Stories shared with the class" is one scrolling shelf above the threads, with a See all page at `/spaces/<slug>/stories`. It also has the line "Only <class> can read these until the writer makes them public."
- **If the class is deleted,** the story stays private to its writer. It never turns public by accident.
- **No ads.** Banners are still stubbed. The rule that class spaces and class stories never show an ad or banner is written into bundle 14 (`pick_banner()`), as Robert decided.

## How it was tested
- Database: `234-class-stories.test.sql` (25 tests):
  - sharing with your own class works, and with a space you aren't in it is refused;
  - the teacher can't change a student's story;
  - who reads the story: the writer, a classmate, the teacher and a moderator can; an adult outside the class and a visitor can't (page, chapter, lists and profile);
  - the class's list;
  - new-chapter notices go only to followers in the class;
  - making it public again;
  - a locked class isn't offered and is refused;
  - the gate function can't be called from the app.
  - The whole database suite passes with the new gate in the shared reading helpers.
- Unit: `classStories.test.ts` (9 tests).
- End to end: `e2e/class-stories.spec.ts`:
  - a student shares from Story settings;
  - the teacher finds the story on the class page and its See all page, and an outsider can't open it;
  - the story is made public again and the outsider reads it;
  - axe and the doodle check on all three screens at 390, 768 and 1440 px, light and night, ro and en.
  - The class, story settings, reader, profile, Discover and notifications specs run too.
- Screenshots at 1440 and 390 px, checked by eye.

## Local check run
LOCALRUN

## By hand
- Nothing. No seed change, so no staging top-up.
- Optional: read the new Romanian lines (`classStories` and `storyClass` in `spaces.json`).

## Board mismatches
- ClassSpace draws class stories inside the class panel. They are a shelf above the threads (one scrolling line, rule 20) with a See all page, and sharing happens in Story settings. Noted in `docs/board-fixes.md`.

## Questions for Robert
These are my proposals; say if you want any changed:
- A class story is hidden from every public list and profile even for classmates. They find it on the class page.
- A story can be shared with one class at a time.
- Classmates still need the story's rating to fit their age, the same as for any story.

## Follow-ups
- Bundle 14: `pick_banner()` must answer "none" on class-only stories and class spaces (added to bundles.md).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
