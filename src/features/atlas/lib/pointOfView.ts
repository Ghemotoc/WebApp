/**
 * pointOfView: who tells a chapter, as the "Point of view" drop-down and the board need it
 * (bundle G10 ATLAS, part c2; board AtlasPov: "Narrator, outside the story").
 *
 * A chapter is told by one of the cast, by the Narrator, or by nobody yet. The database keeps
 * that as a character's ID and a yes/no for the Narrator (never both); the drop-down needs one
 * value, so the Narrator gets a value no character ID can be.
 * Who calls it: ChapterPlanBasics (the drop-down), BoardColumnSection (the card's line),
 * PovLanesView (the Narrator's column) and the data export's planForWord. What it calls: nothing.
 */

/** The drop-down's value for the Narrator; a character's value is its UUID, so they can't clash. */
export const narratorValue = 'narrator';

/** Who tells a chapter, as the database keeps it. */
export interface Teller {
  povCharacterId: string | null;
  povIsNarrator: boolean;
}

/**
 * The drop-down's value for a chapter's teller.
 *
 * @param teller - the chapter's point-of-view character and whether the Narrator tells it
 * @returns '' for nobody yet, narratorValue, or the character's ID
 */
export function pointOfViewValue(teller: Teller): string {
  if (teller.povIsNarrator) return narratorValue;
  return teller.povCharacterId ?? '';
}

/**
 * The change to save for a picked value, in the database's field names.
 *
 * @param value - '' for nobody, narratorValue, or a character's ID
 * @returns both fields, so the two never disagree whatever was saved before
 */
export function pointOfViewChange(value: string): {
  pov_character_id: string;
  pov_is_narrator: boolean;
} {
  if (value === narratorValue) return { pov_character_id: '', pov_is_narrator: true };
  return { pov_character_id: value, pov_is_narrator: false };
}
