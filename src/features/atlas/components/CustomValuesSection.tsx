/**
 * CustomValuesSection: the writer's own fields on a character sheet (story S1-E17-10: "when I
 * define a custom field once, then it appears on every character's sheet in that story").
 *
 * Only fields that aren't removed show; a removed field's values stay in the database and show
 * again when it is brought back. Fields are added and removed in "Your character fields" on the
 * at-a-glance page, which this section links to.
 * Who uses it: CharacterSheet. What it calls: PlanTextField with the save it is given.
 */
import { Link } from 'react-router';

import { FormSection } from '@/features/writing/components/FormSection';

import type { CharacterField, StoryCharacter } from '../api/characters';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { PlanTextField } from './PlanTextField';

/** What the section needs. */
export interface CustomValuesSectionProps {
  slug: string;
  character: StoryCharacter;
  fields: CharacterField[];
  /** Saves one custom value; throws when it can't. */
  saveValue: (fieldId: string, value: string) => Promise<void>;
}

/**
 * Renders the section.
 *
 * @returns the card with one box per field, or a note when there are none
 */
export function CustomValuesSection({
  slug,
  character,
  fields,
  saveValue,
}: CustomValuesSectionProps) {
  const { t } = useAtlasTranslation();
  const shownFields = fields.filter((field) => !field.isHidden);
  return (
    <FormSection legend={t('characters.custom.heading')}>
      {shownFields.length === 0 && <p className="m-0 text-body">{t('characters.custom.none')}</p>}
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
      <Link
        to={`/plan/s/${slug}#atlas-fields-heading`}
        className="inline-flex min-h-11 items-center self-start text-sm text-link underline"
      >
        {t('characters.custom.manage')}
      </Link>
    </FormSection>
  );
}
