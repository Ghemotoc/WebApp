/**
 * Which family word a relationship is told with: mother, father, daughter, son, sister, brother,
 * or the neutral parent, child and sibling (bundle GAPS-3; boards AtlasCharacterRelationship and
 * AtlasFamilyTree: "Mara is the daughter of Elena Rus").
 *
 * - The word follows the gender of the character the sentence starts with: "she" and "he" pick
 *   the gendered word; "they" and not set keep the neutral one.
 * - A "Parent of" relationship is stored from the parent to the child. Seen from the child (on
 *   the child's own sheet) it is told the other way round, as daughter, son or child.
 * - A "Sibling of" relationship reads the same both ways, so seen from the second character it
 *   starts with them and takes their word.
 * - Every other type keeps its one sentence.
 * The answer is a key under "connections.sentences" in src/locales/<language>/atlas.json and
 * whether the two names swap places. Who calls it: useRelationshipWords and the plan's Word file
 * (data-export/lib/planForWord.ts). What it calls: nothing.
 */
import type { CharacterGender, RelationshipKind } from '../api/characters';

/** What the wording needs to know about one relationship. */
export interface FamilyWordInput {
  kind: RelationshipKind;
  /** The gender of the relationship's first character (the parent, for "Parent of"). */
  fromGender: CharacterGender | null;
  /** The gender of its second character (the child, for "Parent of"). */
  toGender: CharacterGender | null;
  /** True when the sentence is told from the second character's side (their own sheet). */
  isFromSecond: boolean;
}

/** The sentence to use and which way round the names go. */
export interface FamilyWording {
  /** The key under "connections.sentences": "parent_of_she", "child_of", "sibling_of_he"… */
  sentenceKey: string;
  /** True when the second character's name comes first. */
  isFlipped: boolean;
}

/** The end of the key for a gender: "_she", "_he", or nothing for "they" and not set. */
function genderSuffix(gender: CharacterGender | null): string {
  if (gender === 'she') return '_she';
  if (gender === 'he') return '_he';
  return '';
}

/**
 * Picks the sentence for one relationship.
 *
 * @param input - the type, both characters' genders and whose side tells it
 * @returns the sentence's key and whether the names swap places
 */
export function familyWording(input: FamilyWordInput): FamilyWording {
  const { kind, fromGender, toGender, isFromSecond } = input;
  if (kind === 'parent_of') {
    // From the child's side: "Mara is the daughter of Elena".
    if (isFromSecond) {
      return { sentenceKey: `child_of${genderSuffix(toGender)}`, isFlipped: true };
    }
    return { sentenceKey: `parent_of${genderSuffix(fromGender)}`, isFlipped: false };
  }
  if (kind === 'sibling_of') {
    // The sentence starts with whoever tells it, and takes their word.
    const teller = isFromSecond ? toGender : fromGender;
    return { sentenceKey: `sibling_of${genderSuffix(teller)}`, isFlipped: isFromSecond };
  }
  return { sentenceKey: kind, isFlipped: false };
}
