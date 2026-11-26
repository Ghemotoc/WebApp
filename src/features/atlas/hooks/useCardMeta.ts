/**
 * useCardMeta: the short line under a character's name on the relationship map and the family
 * tree (user stories bundle 6, stories 6.6 and 6.7, boards E25 and E26: "b. 1948 · ex-miner").
 *
 * The line is the year born ("b. 1951") or what the writer wrote there ("13", "1956–1974"), then
 * the occupation, else the character in a line. On the map the protagonist says "protagonist"
 * instead, beside their ring (board E25); the tree's ring marks whose tree it is, so it leaves the
 * role out (board E26).
 * Who uses it: MapCards and FamilyTreeDrawing. What it calls: the Atlas translations.
 */
import type { StoryCharacter } from '../api/characters';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/** A year on its own, such as "1951", which reads as "b. 1951". */
const yearOnly = /^\d{4}$/;

/** Joins the facts under a card's name with a middot. */
const factSeparator = ' · ';

/**
 * Gives a function that writes a character's card line.
 *
 * @param showsProtagonist - true on the map, where the protagonist's line says so
 * @returns a function from a character to their line, or an empty string when nothing is known
 */
export function useCardMeta(showsProtagonist: boolean) {
  const { t } = useAtlasTranslation();
  return (character: StoryCharacter): string => {
    const facts: string[] = [];
    // Step 1: the year born ("b. 1951"), or the writer's own words for it ("13", "1956–1974").
    const born = (character.sheet.age_or_born ?? '').trim();
    if (born !== '') {
      facts.push(yearOnly.test(born) ? t('connections.map.born', { year: born }) : born);
    }
    // Step 2: the protagonist on the map; otherwise their work, else their line.
    const occupation = (character.sheet.occupation ?? '').trim();
    const summary = (character.sheet.summary ?? '').trim();
    if (showsProtagonist && character.role === 'protagonist') {
      facts.push(t('characters.role.protagonist').toLowerCase());
    } else if (occupation !== '') {
      facts.push(occupation);
    } else if (summary !== '') {
      facts.push(summary);
    }
    return facts.join(factSeparator);
  };
}
