/**
 * The writer's own groups of details on a character sheet, worked out from the details themselves
 * (bundle GAPS-1): a group has no row of its own, it exists while one of its details does
 * (story_character_fields.own_group).
 *
 * Who calls it: CharacterSheet. What it calls: nothing.
 */
import type { CharacterField } from '../api/characters';

/** One of the writer's own groups with the details in it. */
export interface OwnDetailGroup {
  name: string;
  fields: CharacterField[];
}

/**
 * The groups that have a detail to show, in the order their first detail was added.
 *
 * @param fields - every detail of the writer's own in the story, in the story's order
 * @returns each group's name with its details; a group whose details are all removed is left out
 */
export function ownDetailGroups(fields: CharacterField[]): OwnDetailGroup[] {
  const groups: OwnDetailGroup[] = [];
  for (const field of fields) {
    if (field.ownGroup === null) continue;
    const group = groups.find((candidate) => candidate.name === field.ownGroup);
    if (group === undefined) groups.push({ name: field.ownGroup, fields: [field] });
    else group.fields.push(field);
  }
  return groups.filter((group) => group.fields.some((field) => !field.isHidden));
}
