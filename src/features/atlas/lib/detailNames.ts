/**
 * detailNames: the hint beside a folded group of a writer's own details on a character sheet
 * (CALM-9, board E23: "custom fields (their names)").
 *
 * Who calls it: OwnDetailGroupSection and CustomValuesSection. What it calls: nothing.
 */
import type { CharacterField } from '../api/characters';

/**
 * The names of the details shown in a group, joined with commas.
 *
 * @param fields - the group's details
 * @returns the names, or undefined when the group shows none yet
 */
export function detailNames(fields: CharacterField[]): string | undefined {
  // A removed detail doesn't show on the sheet, so it isn't named in the hint either.
  const names = fields.filter((field) => !field.isHidden).map((field) => field.name);
  if (names.length === 0) return undefined;
  return names.join(', ');
}
