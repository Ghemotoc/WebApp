/**
 * CustomValuesSection: the writer's own fields on a character sheet (story S1-E17-10: "when I
 * define a custom field once, then it appears on every character's sheet in that story").
 *
 * It holds the fields with no place of their own: the ones placed under a built-in group or in a
 * group of the writer's show there instead (bundle GAPS-1). Only fields that aren't removed
 * show; a removed field's values stay in the database and show again when it is brought back.
 * "Add detail" adds one here; fields are removed and brought back in "Character fields" on the
 * at-a-glance page, which this section links to.
 * Who uses it: CharacterSheet. What it calls: OwnDetailBoxes with the save it is given and
 * AddDetailForm.
 */
import { Link } from 'react-router';

import { FormSection } from '@/features/writing/components/FormSection';

import type { CharacterField, StoryCharacter } from '../api/characters';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { AddDetailForm } from './AddDetailForm';
import { OwnDetailBoxes } from './OwnDetailBoxes';

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
  const heading = t('characters.custom.heading');
  // The fields with no place: neither under a built-in group nor in a group of the writer's.
  const unplaced = fields.filter((field) => field.sheetGroup === null && field.ownGroup === null);
  const hasShownFields = unplaced.some((field) => !field.isHidden);
  return (
    <FormSection legend={heading}>
      {!hasShownFields && <p className="m-0 text-body">{t('characters.custom.none')}</p>}
      <OwnDetailBoxes character={character} fields={unplaced} saveValue={saveValue} />
      <AddDetailForm
        slug={slug}
        id="atlas-add-detail-unplaced"
        place={{ sheetGroup: null, ownGroup: null }}
        groupLabel={heading}
      />
      <Link
        to={`/plan/s/${slug}#atlas-fields-heading`}
        className="inline-flex min-h-11 items-center self-start text-sm text-link underline"
      >
        {t('characters.custom.manage')}
      </Link>
    </FormSection>
  );
}
