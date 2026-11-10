/**
 * povLanes: the point-of-view lanes' columns (story S1-E17-21): one per character who tells at
 * least one chapter, in the cast's order, then the Narrator when a chapter is told from outside
 * the story (bundle G10 ATLAS, part c2; board AtlasPov).
 *
 * Who calls it: components/PovLanesView.tsx. What it calls: lib/pointOfView.ts.
 */
import type { StorylineChapter } from '../api/storyline';

import { narratorValue, pointOfViewValue } from './pointOfView';

/** One column of the lanes: a character, or the Narrator (id narratorValue, no name of its own). */
export interface LaneTeller {
  /** The character's ID, or narratorValue. */
  id: string;
  /** The character's name; null for the Narrator, whose name is interface text. */
  name: string | null;
}

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

/**
 * The lanes' columns: every character who tells a chapter, then the Narrator if they tell one.
 *
 * @param characters - the story's characters, in the cast's order
 * @param chapters - the chapters
 * @returns the columns, left to right
 */
export function laneTellers(
  characters: { id: string; name: string }[],
  chapters: StorylineChapter[],
): LaneTeller[] {
  const tellers: LaneTeller[] = povCharacters(characters, chapters).map((character) => ({
    id: character.id,
    name: character.name,
  }));
  if (chapters.some((chapter) => chapter.povIsNarrator)) {
    tellers.push({ id: narratorValue, name: null });
  }
  return tellers;
}

/**
 * Whether a column's teller tells a chapter.
 *
 * @param chapter - the chapter
 * @param tellerId - a character's ID, or narratorValue
 * @returns true when the chapter's mark goes in that column
 */
export function isToldBy(chapter: StorylineChapter, tellerId: string): boolean {
  return pointOfViewValue(chapter) === tellerId;
}
