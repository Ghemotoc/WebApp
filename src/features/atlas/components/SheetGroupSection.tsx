/**
 * SheetGroupSection: one of the four groups of a character sheet (story S1-E17-09): Basics, Look
 * and voice, Inside, or In the story.
 *
 * One box per field, each saving by itself after a pause; the short facts are one line, the rest
 * grow with the text ("Given a long field, when I write, then the box grows with the text").
 * Extra content (the first appearance in In the story) comes in as children.
 * Who uses it: CharacterSheet. What it calls: PlanTextField with the save it is given.
 */
import type { ReactNode } from 'react';

import { FormSection } from '@/features/writing/components/FormSection';

import {
  sheetGroups,
  type SheetGroup,
  type SheetKey,
  type StoryCharacter,
} from '../api/characters';
import { useAtlasTranslation } from '../registerAtlasTranslations';

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
  group: SheetGroup;
  character: StoryCharacter;
  /** Saves one sheet field; throws when it can't. */
  saveSheetField: (key: SheetKey, value: string) => Promise<void>;
  children?: ReactNode;
}

/**
 * Renders the group.
 *
 * @returns the card with the group's fields
 */
export function SheetGroupSection({
  group,
  character,
  saveSheetField,
  children,
}: SheetGroupSectionProps) {
  const { t } = useAtlasTranslation();
  return (
    <FormSection legend={t(`characters.groups.${group}`)}>
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
      {children}
    </FormSection>
  );
}
