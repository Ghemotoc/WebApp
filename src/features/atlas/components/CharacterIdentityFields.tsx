/**
 * CharacterIdentityFields: the name, role and "In a line" at the top of a character sheet's
 * Basics (stories S1-E17-08 and S1-E17-09; bundle G10a adds "In a line", the character in one
 * line that the cast cards and the sheet's header show under the name). The role decides the
 * group the character is listed in.
 *
 * Who uses it: CharacterSheet. What it calls: PlanTextField and PlanSelectField with the save it
 * is given.
 */
import { characterRoles, type CharacterChange, type StoryCharacter } from '../api/characters';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { PlanSelectField } from './PlanSelectField';
import { PlanTextField } from './PlanTextField';

/**
 * Renders the two fields.
 *
 * @param props.character - the character
 * @param props.saveChange - saves one change; throws when it can't
 * @returns the name box, the role drop-down and the one-line summary
 */
export function CharacterIdentityFields({
  character,
  saveChange,
}: {
  character: StoryCharacter;
  saveChange: (change: CharacterChange) => Promise<void>;
}) {
  const { t } = useAtlasTranslation();
  return (
    <>
      <div className="flex flex-wrap items-start gap-x-8 gap-y-2">
        <div className="min-w-0 flex-1 basis-60">
          <PlanTextField
            id="atlas-character-name"
            label={t('characters.name')}
            maxLength={120}
            isValid={(name) => name.trim() !== ''}
            invalidMessage={t('characters.nameRequired')}
            savedValue={character.name}
            save={async (name) => saveChange({ name })}
          />
        </div>
        <PlanSelectField
          id="atlas-character-role"
          label={t('characters.roleLabel')}
          options={characterRoles.map((role) => ({
            value: role,
            label: t(`characters.role.${role}`),
          }))}
          savedValue={character.role}
          save={async (role) => saveChange({ role: role as StoryCharacter['role'] })}
        />
      </div>
      <PlanTextField
        id="atlas-character-summary"
        label={t('characters.fields.summary')}
        hint={t('characters.hints.summary')}
        maxLength={200}
        savedValue={character.sheet.summary ?? ''}
        save={async (summary) => saveChange({ sheet: { summary } })}
      />
    </>
  );
}
