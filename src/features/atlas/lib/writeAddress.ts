/**
 * Where "Write" in the Story Atlas top bar goes (stories S1-E17-01 and S1-E17-02).
 *
 * Who calls it: StoryAtlasPage and CharactersPage. What it calls: nothing.
 */
import type { MyStory } from '@/features/writing/api/stories';

/**
 * The latest chapter in the editor, or Your writing for a story with no chapters.
 *
 * @param story - the story from the writer's list, or undefined while it loads
 * @returns the address
 */
export function writeAddressFor(story: MyStory | undefined): string {
  const latestChapter = story?.chapters.at(-1);
  if (story === undefined || latestChapter === undefined) return '/write';
  return `/write/s/${story.slug}/c/${latestChapter.code}`;
}
