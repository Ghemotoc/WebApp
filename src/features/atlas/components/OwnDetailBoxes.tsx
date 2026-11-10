/**
 * OwnDetailBoxes: the boxes for some of the writer's own details on a character sheet (story
 * S1-E17-10; bundle GAPS-1).
 *
 * One box per detail that isn't removed, each saving by itself after a pause. Which details it
 * gets decides where they show: under a built-in group, in a group of the writer's own, or in
 * "Custom fields". Who uses it: SheetGroupSection, OwnDetailGroupSection and CustomValuesSection.
 * What it calls: PlanTextField with the save it is given.
 */
import type { CharacterField, StoryCharacter } from '../api/characters';

import { PlanTextField } from './PlanTextField';

/** What the boxes need. */
export interface OwnDetailBoxesProps {
  character: StoryCharacter;
  /** The details to show here; removed ones are left out. */
  fields: CharacterField[];
  /** Saves one detail's value; throws when it can't. */
  saveValue: (fieldId: string, value: string) => Promise<void>;
}

/**
 * Renders the boxes.
 *
 * @returns one box per shown detail, or nothing when there are none
 */
export function OwnDetailBoxes({ character, fields, saveValue }: OwnDetailBoxesProps) {
  const shownFields = fields.filter((field) => !field.isHidden);
  if (shownFields.length === 0) return null;
  return (
    <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
      {shownFields.map((field) => (
        <PlanTextField
          key={field.id}
          id={`atlas-custom-${field.id}`}
          label={field.name}
          isMultiline
          maxLength={20000}
          savedValue={character.customValues[field.id] ?? ''}
          save={async (value) => saveValue(field.id, value)}
        />
      ))}
    </div>
  );
}
