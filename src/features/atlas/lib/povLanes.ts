/**
 * povLanes: the point-of-view lanes' columns (story S1-E17-21): one per character who tells at
 * least one chapter, in the cast's order.
 *
 * Who calls it: components/PovLanesView.tsx. What it calls: nothing.
 */
import type { StorylineChapter } from '../api/storyline';

/**
 * The characters that are a chapter's point of view.
 *
 * @param characters - the story's characters, in the cast's order
 * @param chapters - the chapters
 * @returns the characters with at least one chapter, in the same order
 */
export function povCharacters<Character extends { id: string }>(
  characters: Character[],
  chapters: StorylineChapter[],
): Character[] {
  const tellers = new Set(chapters.map((chapter) => chapter.povCharacterId));
  return characters.filter((character) => tellers.has(character.id));
}
