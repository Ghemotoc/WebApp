/**
 * Automatic covers: the drawn design a story gets when the writer skips the cover step
 * (story S1-E3-13; decided 16 Oct 2026: "Stories without their own cover get one of the 16
 * designs automatically, always the same for that story and different from the cards next to
 * it"; the clash rule accepted 23 Oct 2026, Q4).
 *
 * The rules:
 *   - The design comes from the story's ID, never from the title, so it is the same on every
 *     screen and never changes when the title or anything else changes. No cover file is stored.
 *   - The story page and the writer's own screens always show that first choice.
 *   - In a row of cards (shelves, lists, search results, the library), two neighbours never share
 *     a design: a card with an automatic cover that clashes moves to its second choice, also
 *     taken from the ID, so the same row always looks the same. A design the writer chose is
 *     never changed.
 *   - The story ID is used for the choice but never shown (architecture 1.6).
 * Who uses it: resolveCoverChoice() in every screen that draws a cover (WriterStoryCard,
 * StoryPreviewAside, StoryCard rows through designsForRow(), the story page and the teaser);
 * the form's "Right now: Sky, picked for you automatically" line.
 */
import {
  coverDesignKeys,
  defaultChoiceFor,
  type CoverDesignKey,
  type DrawnCoverChoice,
} from './coverDesigns';

/** A story as the cover code needs it: its ID, its cover kind and, for drawn covers, the choice. */
export interface CoverSource {
  id: string;
  coverKind: 'automatic' | 'drawn' | 'upload';
  drawnCover: DrawnCoverChoice | null;
}

/**
 * A small, stable hash of a text (FNV-1a, 32 bits), the same in every browser and in Node.
 *
 * @param text - the story ID
 * @param seed - a different seed gives a different, independent sequence
 * @returns an unsigned 32-bit number
 */
function hashText(text: string, seed: number): number {
  let hash = 0x811c9dc5 ^ seed;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/**
 * The story's choices of design, in order: the first is the one it normally shows; the next
 * ones are its fall-backs when a neighbour in a row already shows the same design. Every choice
 * comes from the ID, and no two consecutive choices are the same design.
 *
 * @param storyId - the story's ID
 * @param count - how many choices to list
 * @returns the design keys
 */
export function automaticDesignChoices(storyId: string, count = 3): CoverDesignKey[] {
  const choices: CoverDesignKey[] = [];
  for (let seed = 0; choices.length < count; seed += 1) {
    const key = coverDesignKeys[hashText(storyId, seed) % coverDesignKeys.length];
    if (key !== undefined && key !== choices[choices.length - 1]) choices.push(key);
  }
  return choices;
}

/**
 * The design a story gets automatically: its first choice, with the design's board colours.
 *
 * @param storyId - the story's ID
 * @returns the drawn cover choice
 */
export function automaticCoverFor(storyId: string): DrawnCoverChoice {
  const [first] = automaticDesignChoices(storyId, 1);
  return defaultChoiceFor(first ?? 'plum');
}

/**
 * The cover to draw for a story on its own (the story page, the writer's screens): the drawn
 * choice when the writer made one, otherwise the automatic cover from the ID. An uploaded cover
 * (behind picture_uploads) has no drawn choice; until the upload story draws it, the automatic
 * cover stands in so nothing is ever empty.
 *
 * @param story - the story's ID, cover kind and drawn choice
 * @returns what to draw
 */
export function resolveCoverChoice(story: CoverSource): DrawnCoverChoice {
  if (story.coverKind === 'drawn' && story.drawnCover !== null) return story.drawnCover;
  return automaticCoverFor(story.id);
}

/**
 * The covers to draw for a row of stories, so that two neighbours never share a design.
 * A chosen (drawn) cover is never changed; an automatic one that would repeat the card before
 * it moves to its next choice from the ID. Looking only at the card before keeps the result
 * stable: the same row always looks the same, and adding cards at the end changes nothing.
 *
 * @param stories - the stories in row order
 * @returns one cover choice per story, in the same order
 */
export function designsForRow(stories: CoverSource[]): DrawnCoverChoice[] {
  const covers: DrawnCoverChoice[] = [];
  for (const story of stories) {
    const previous = covers[covers.length - 1];
    // A design the writer chose is never changed, even when it repeats the neighbour's.
    if (story.coverKind === 'drawn' && story.drawnCover !== null) {
      covers.push(story.drawnCover);
      continue;
    }
    // The first choice from the ID, unless the card before shows the same design.
    const choices = automaticDesignChoices(story.id, 3);
    const design = choices.find((candidate) => candidate !== previous?.design) ?? choices[0];
    covers.push(defaultChoiceFor(design ?? 'plum'));
  }
  return covers;
}
