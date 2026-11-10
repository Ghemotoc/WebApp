/**
 * AddDetailGroupForm: "Add a group of details" at the foot of a character sheet (bundle GAPS-1;
 * board AtlasCharacterSheet).
 *
 * Closed, it is one grey glass button. Open, it asks for the group's name and its first detail,
 * because a group exists while it holds a detail (so there is never an empty card to tidy away).
 * The group then shows on every character's sheet in the story. A plain message says when it
 * didn't save; a story holds up to 12 groups and 40 details. "Add group" waits while a save is on
 * its way, so a double click adds one detail (break test, 10 Nov 2026).
 * Who uses it: CharacterSheet. What it calls: useDetailChangers' addDetail and
 * useDetailFormSave.
 */
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextInput } from '@/components/ui/TextInput';

import { useDetailChangers } from '../hooks/useDetailChangers';
import { useBuiltInGroupNames, useDetailFormSave } from '../hooks/useDetailFormSave';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/** The form's two boxes, empty. */
const emptyGroup = { groupName: '', detailName: '' };

/** The group's name and its first detail, side by side on a laptop. */
function GroupBoxes({
  typed,
  setTyped,
}: {
  typed: typeof emptyGroup;
  setTyped: (typed: typeof emptyGroup) => void;
}) {
  const { t } = useAtlasTranslation();
  return (
    <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
      <TextInput
        id="atlas-new-group-name"
        label={t('characters.details.groupName')}
        hint={t('characters.details.groupNameHint')}
        maxLength={60}
        value={typed.groupName}
        onChange={(event) => setTyped({ ...typed, groupName: event.target.value })}
      />
      <TextInput
        id="atlas-new-group-detail"
        label={t('characters.details.firstDetail')}
        hint={t('characters.details.nameHint')}
        maxLength={60}
        value={typed.detailName}
        onChange={(event) => setTyped({ ...typed, detailName: event.target.value })}
      />
    </div>
  );
}

/**
 * Renders the button, or the open form.
 *
 * @param props.slug - the story's address
 * @returns "Add a group of details", or the two boxes with Add group and Cancel
 */
export function AddDetailGroupForm({ slug }: { slug: string }) {
  const { t } = useAtlasTranslation();
  const { addDetail } = useDetailChangers(slug);
  const [isOpen, setIsOpen] = useState(false);
  const [typed, setTyped] = useState(emptyGroup);
  const { message, isSaving, say, save } = useDetailFormSave();
  const isBuiltInGroupName = useBuiltInGroupNames();

  // Opening the form puts the cursor in its first box, so the keyboard carries on from the button.
  useEffect(() => {
    if (isOpen) document.getElementById('atlas-new-group-name')?.focus();
  }, [isOpen]);

  /** Adds the group with its first detail and closes, or says why not. */
  async function add() {
    if (typed.groupName.trim() === '') return say(t('characters.details.groupNameRequired'));
    if (isBuiltInGroupName(typed.groupName)) return say(t('characters.details.groupNameTaken'));
    if (typed.detailName.trim() === '') return say(t('characters.details.nameRequired'));
    const isSaved = await save(
      () => addDetail({ name: typed.detailName, sheetGroup: null, ownGroup: typed.groupName }),
      'characters.details.groupFailed',
    );
    if (!isSaved) return;
    setTyped(emptyGroup);
    setIsOpen(false);
  }

  if (!isOpen) {
    return (
      <Button variant="secondary" className="self-start" onClick={() => setIsOpen(true)}>
        {t('characters.details.addGroup')}
      </Button>
    );
  }
  return (
    <form
      aria-label={t('characters.details.addGroup')}
      className="flex min-w-0 flex-col gap-3 rounded-card border border-border bg-surface px-7 py-[26px] shadow-card"
      onSubmit={(event) => {
        event.preventDefault();
        void add();
      }}
    >
      <GroupBoxes typed={typed} setTyped={setTyped} />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isSaving}>
          {t('characters.details.addGroupConfirm')}
        </Button>
        <Button variant="secondary" onClick={() => setIsOpen(false)}>
          {t('characters.details.cancel')}
        </Button>
      </div>
      <div aria-live="polite">{message !== null && <Notice tone="error">{message}</Notice>}</div>
    </form>
  );
}
