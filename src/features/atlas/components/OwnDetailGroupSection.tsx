/**
 * OwnDetailGroupSection: one of the writer's own groups of details on a character sheet, such as
 * "Magic" or "School" (bundle GAPS-1; board AtlasCharacterSheet, "Add a group of details").
 *
 * The group's name is the card's heading; under it one box per detail, "Add detail" and
 * "Rename group". A group shows on every character's sheet in the story, like the details in it
 * (S1-E17-10). A group whose details are all removed doesn't show; bringing one back on the
 * at-a-glance page brings the group back.
 * Who uses it: CharacterSheet. What it calls: OwnDetailBoxes, AddDetailForm and useDetailChangers'
 * renameDetailGroup.
 */
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextInput } from '@/components/ui/TextInput';
import { FormSection } from '@/features/writing/components/FormSection';

import type { CharacterField, StoryCharacter } from '../api/characters';
import { useDetailChangers } from '../hooks/useDetailChangers';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { AddDetailForm } from './AddDetailForm';
import { OwnDetailBoxes } from './OwnDetailBoxes';

/** What the section needs. */
export interface OwnDetailGroupSectionProps {
  slug: string;
  /** The group's name, as the writer typed it. */
  name: string;
  /** The group's place among the writer's groups, for unique IDs. */
  index: number;
  character: StoryCharacter;
  /** The details in this group. */
  fields: CharacterField[];
  saveValue: (fieldId: string, value: string) => Promise<void>;
}

/** "Rename group": one button, or the open box with Save and Cancel. */
function RenameGroupForm({
  slug,
  name,
  index,
}: Pick<OwnDetailGroupSectionProps, 'slug' | 'name' | 'index'>) {
  const { t } = useAtlasTranslation();
  const { renameDetailGroup } = useDetailChangers(slug);
  const [isOpen, setIsOpen] = useState(false);
  const [newName, setNewName] = useState(name);
  const [message, setMessage] = useState<string | null>(null);

  const boxId = `atlas-rename-group-${index}`;
  // Opening the form puts the cursor in its box, so the keyboard carries on from the button.
  useEffect(() => {
    if (isOpen) document.getElementById(boxId)?.focus();
  }, [isOpen, boxId]);

  /** Saves the new name and closes, or says why not. */
  async function rename() {
    setMessage(null);
    if (newName.trim() === '') return setMessage(t('characters.details.groupNameRequired'));
    await renameDetailGroup(name, newName)
      .then(() => setIsOpen(false))
      .catch(() => setMessage(t('characters.details.renameFailed')));
  }

  if (!isOpen) {
    return (
      <Button
        variant="secondary"
        className="self-start"
        aria-label={t('characters.details.renameGroupNamed', { group: name })}
        onClick={() => setIsOpen(true)}
      >
        {t('characters.details.renameGroup')}
      </Button>
    );
  }
  return (
    <form
      className="flex min-w-0 flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        void rename();
      }}
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 basis-48">
          <TextInput
            id={boxId}
            label={t('characters.details.groupName')}
            maxLength={60}
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
          />
        </div>
        <Button type="submit">{t('characters.details.save')}</Button>
        <Button variant="secondary" onClick={() => setIsOpen(false)}>
          {t('characters.details.cancel')}
        </Button>
      </div>
      <div aria-live="polite">{message !== null && <Notice tone="error">{message}</Notice>}</div>
    </form>
  );
}

/**
 * Renders the group.
 *
 * @returns the card with the group's details, "Add detail" and "Rename group"
 */
export function OwnDetailGroupSection(props: OwnDetailGroupSectionProps) {
  const { slug, name, index, character, fields, saveValue } = props;
  return (
    <FormSection legend={name}>
      <OwnDetailBoxes character={character} fields={fields} saveValue={saveValue} />
      <div className="flex flex-wrap items-start gap-3">
        <AddDetailForm
          slug={slug}
          id={`atlas-add-detail-own-${index}`}
          place={{ sheetGroup: null, ownGroup: name }}
          groupLabel={name}
        />
        <RenameGroupForm slug={slug} name={name} index={index} />
      </div>
    </FormSection>
  );
}
