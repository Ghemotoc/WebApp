<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Bundle 14b NEW-1, part a: who can read a story (your request of 2 Nov 2026, 21:51 to 21:54). This feature has no story issue. This branch sits on top of #326 (and so on #325 to #318). It targets #326's branch until those merge, and then main.

## What changed

- **Story settings › Who can read it:** Public, Unlisted or Private, with a line under the chips saying what each means. A new story is public.
  - **Unlisted** works like an unlisted video. It is out of Discover, every shelf, search, tag pages and the writer's public profile, but anyone with the link reads it, and signed-in readers save, like and comment as usual.
    - It stays in the library of anyone who saved it.
    - On someone else's public library, it shows only to viewers who saved or follow it themselves.
  - **Private:** only the writer opens it, even after chapters are published. It leaves readers' libraries too.
- **New-chapter notices:**
  - For an unlisted story, only the people who follow that story are told. The writer's followers aren't told, because telling them would reveal the story. This is my reading of your note, as a proposal.
  - For a private story, nobody is told.
- **Unchanged:** staff Restrict and Hide still sit on top and win. Ratings, blocks, reporting and moderation work as for a public story. Class-only sharing stays the class's own setting. The "App only" switch comes with the apps, as the plan says.
- **Database** (`…_new1_who_can_read.sql`):
  - `stories.visibility`;
  - two gates:
    - `story_visibility_allows()`, inside every reading path: `chapter_is_readable()`, `story_has_readable_chapter()` and `reader_visible_story()`;
    - `story_listing_allows()`, inside `listed_stories()`, which every list, search, tag page and library uses;
  - `profile_story_cards()`, the cover check and `notify_chapter_published()` follow the same rules;
  - `set_my_story_visibility()` saves the writer's choice.
- Words are in both languages.
- **Records:** the code tour and a decisions row.

## How it was tested

- The new database test `278-who-can-read` (17 tests):
  - only the writer can change the setting;
  - unlisted: the story opens with the link, it is in no list and not on the writer's profile, and it stays in a saver's library;
  - unlisted, on someone else's library: hidden from a viewer until they follow the story;
  - unlisted: only the story's followers hear of a chapter;
  - private: only the writer opens it, it leaves a saver's library, and nobody is told;
  - made public again, it is back in the lists.
- The new e2e test `story-visibility.spec.ts`:
  - the writer makes the story Unlisted; a visitor still reads it by its link, and it is gone from the profile;
  - the writer makes it Private; the visitor sees "This story isn't available" and the writer still opens it;
  - axe and no sideways scrolling at 390, 768 and 1440 px.

## Local check run

LOCALRUN

## By hand

Nothing.

## Questions for Robert

None blocking. One proposal to confirm or change: the writer's followers aren't told about new chapters of an unlisted story, only its own followers.

## Follow-ups

- Show Unlisted and Private on the writer's own story cards in Your writing.
- Show staff the writer's choice on the Staff › Stories page.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
