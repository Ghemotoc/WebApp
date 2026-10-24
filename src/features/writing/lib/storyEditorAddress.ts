/**
 * Where a story opens from a list of the writer's stories (story S1-E3-02a).
 *
 * Who uses it: EditorAside's "Your stories" list; Manage chapters (S1-E3-04) can reuse it.
 */
import type { MyStory } from '../api/stories';

/**
 * The address: the latest chapter's editor, or the settings page while the story has no chapter.
 *
 * @param story - one of the writer's stories
 * @returns the address
 */
export function storyEditorAddress(story: MyStory): string {
  const latest = story.chapters.at(-1);
  return latest === undefined
    ? `/write/s/${story.slug}/settings`
    : `/write/s/${story.slug}/c/${latest.code}`;
}
