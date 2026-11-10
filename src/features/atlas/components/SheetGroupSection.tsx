/**
 * SheetGroupSection: one of the four groups of a character sheet (story S1-E17-09): Basics, Look
 * and voice, Inside, or In the story.
 *
 * One box per field, each saving by itself after a pause; the short facts are one line, the rest
 * grow with the text ("Given a long field, when I write, then the box grows with the text").
 * Extra content comes in as `before` (the name, role and line at the top of Basics) and as
 * children (the first appearance in In the story). The fields sit in two columns on a laptop
 * (bundle G10a, board AtlasCharacterSheet) and one on a phone.
 * Under the group's own fields come the writer's details placed in this group and "Add detail"
 * (bundle GAPS-1, same board).
 * Who uses it: CharacterSheet. What it calls: PlanTextField with the save it is given,
 * OwnDetailBoxes and AddDetailForm.
 */
import type { ReactNode } from 'react';

import { FormSection } from '@/features/writing/components/FormSection';

import {
  sheetGroups,
  type CharacterField,
  type SheetGroup,
  type SheetKey,
  type StoryCharacter,
} from '../api/characters';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { AddDetailForm } from './AddDetailForm';
import { OwnDetailBoxes } from './OwnDetailBoxes';
import { PlanTextField } from './PlanTextField';

/** The fields that hold a word or a short phrase, so they are one line. */
const oneLineKeys: readonly SheetKey[] = [
  'also_known_as',
  'species',
  'pronouns',
  'age_or_born',
  'life_status',
  'occupation',
  'origin',
];

/** The fields with a hint under their label. */
const keysWithHint: readonly SheetKey[] = ['also_known_as', 'age_or_born', 'life_status'];

/** What the group needs. */
export interface SheetGroupSectionProps {
  slug: string;
  group: SheetGroup;
  character: StoryCharacter;
  /** Every detail of the writer's own in the story; the ones placed in this group show here. */
  fields: CharacterField[];
  /** Saves one of the writer's own details; throws when it can't. */
  saveDetail: (fieldId: string, value: string) => Promise<void>;
  /** Saves one sheet field; throws when it can't. */
  saveSheetField: (key: SheetKey, value: string) => Promise<void>;
  /** Shown above the group's own fields. */
  before?: ReactNode;
  children?: ReactNode;
}

/**
 * Renders the group.
 *
 * @returns the card with the group's fields
 */
export function SheetGroupSection(props: SheetGroupSectionProps) {
  const { slug, group, character, saveSheetField, before, children } = props;
  const { t } = useAtlasTranslation();
  const groupLabel = t(`characters.groups.${group}`);
  return (
    <FormSection legend={groupLabel}>
      {before}
      <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
        {sheetGroups[group].map((key) => (
          <PlanTextField
            key={key}
            id={`atlas-character-${key}`}
            label={t(`characters.fields.${key}`)}
            hint={keysWithHint.includes(key) ? t(`characters.hints.${key}`) : undefined}
            isMultiline={!oneLineKeys.includes(key)}
            maxLength={20000}
            savedValue={character.sheet[key] ?? ''}
            save={async (value) => saveSheetField(key, value)}
          />
        ))}
      </div>
      {children}
      <OwnDetailBoxes
        character={character}
        fields={props.fields.filter((field) => field.sheetGroup === group)}
        saveValue={props.saveDetail}
      />
      <AddDetailForm
        slug={slug}
        id={`atlas-add-detail-${group}`}
        place={{ sheetGroup: group, ownGroup: null }}
        groupLabel={groupLabel}
      />
    </FormSection>
  );
}
