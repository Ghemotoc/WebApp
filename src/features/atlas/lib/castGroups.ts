/**
 * Groups a story's cast by role and filters it by what the writer types (story S1-E17-08:
 * "they are grouped by role … and I can filter them by typing").
 *
 * Who calls it: components/CastList.tsx. What it calls: nothing.
 */
import { characterRoles, type CharacterRole, type StoryCharacter } from '../api/characters';

/** One group of the cast list. */
export interface CastGroup {
  role: CharacterRole;
  characters: StoryCharacter[];
}

/** A name or alias folded for matching: lower case, accents off ("Ștefan" matches "stef"). */
function folded(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase();
}

/**
 * Says whether a character matches the filter, by name or "also known as".
 *
 * @param character - the character
 * @param filter - what the writer typed; empty matches everyone
 * @returns true when it matches
 */
export function matchesFilter(character: StoryCharacter, filter: string): boolean {
  const wanted = folded(filter.trim());
  if (wanted === '') return true;
  const searched = `${character.name} ${character.sheet.also_known_as ?? ''}`;
  return folded(searched).includes(wanted);
}

/**
 * The cast in its six groups, in role order, leaving out empty groups.
 *
 * @param characters - the cast, already in name order (story_cast())
 * @param filter - what the writer typed in the filter box
 * @returns the groups that have someone in them
 */
export function groupCast(characters: StoryCharacter[], filter: string): CastGroup[] {
  const matching = characters.filter((character) => matchesFilter(character, filter));
  return characterRoles
    .map((role) => ({ role, characters: matching.filter((character) => character.role === role) }))
    .filter((group) => group.characters.length > 0);
}
