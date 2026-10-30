<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

This is part (g) of the CMS-1 bundle in Robert's full-app plan: rank badges for a story's tags, from his messages in the project thread (30 Oct 2026, 10:44 to 10:48). There is no story or issue for it, and I haven't opened one (CLAUDE.md: new issues only when Robert asks).

## What changed

- **Story page:** under the cover, gold information pills show where the story stands in its tags, for example "#3 in Owls". Screen readers also hear "out of 6 stories". The tag name is shown in the reader's language.
- **Same formula:** a rank is the story's position in that tag page's popular order (`story_scores` from S1-E5-03, then the newer story, then the address). The badge therefore always matches the tag page.
- **Counted per reader:** ranks use `listed_stories()`, so they count only the stories this reader may see (the rating for their age, blocks and moderation). A 16+ story ahead counts for an adult but not for a 14-year-old.
- **Top 3 or the writer's pick:** the cover shows the 3 best ranks. In Story settings, the new "Rank badges on the cover" section shows one chip per approved tag with its rank ("Owls · #3 of 6"). The writer can pick up to 3. "Show my 3 best ranks instead" goes back to automatic. Picks save at once, apart from the form's Save button, because they work on tags that are already saved.
- **When no rank shows:**
  - a story with no score yet (otherwise every story ties at 0 and the rank only says how new it is);
  - a tag with fewer than `rank_badge_min_stories` stories (a new setting, default 5), so "#1 in Owls" among 2 stories doesn't read as an achievement;
  - a tag that isn't approved.
- **Database:**
  - the column `stories.rank_badge_tag_ids` (at most 3; null means automatic);
  - `story_rank_in_tag()` (internal);
  - `story_tag_ranks(story_slug)` (anon and authenticated; returns nothing when the reader may not see the story);
  - `set_rank_badge_tags(story_slug, tag_names)` (the story's writer only; refuses more than 3 tags or a tag that isn't an approved tag on the story).
- **No new table and no new policy.**
- **Chip:** gains an optional `isDisabled`, used to switch off a fourth pick.

## How it was tested

- `supabase/tests/database/176-tag-rank-badges.test.sql` (17 checks):
  - the ranks for a visitor, a 14-year-old and an adult;
  - no rank without a score or for a small tag;
  - the top-3 choice and its tie-break;
  - the writer's picks and the refusals (too many, a waiting tag, another writer's story, signed out).
- `e2e/tag-rank-badges.spec.ts` (5 tests):
  - a visitor sees "#3 in …" in English and Romanian;
  - the writer picks one tag, and the cover then shows only that one;
  - "Show my 3 best ranks instead" brings the automatic badges back;
  - axe on Story settings at 390 px in ro and en.
- `src/features/tags/lib/rankPick.test.ts`.
- The full local check run: see below.

## Follow-ups

- The badges show on the story page only. Showing them on story cards (Discover, shelves) would mean ranking every card on every list for each reader, so it needs a cached rank table first.
- `rank_badge_min_stories` (5) and the "no score, no rank" rule are my proposals; both can be changed in Staff › Settings.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
