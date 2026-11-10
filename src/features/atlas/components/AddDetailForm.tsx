/**
 * AddDetailForm: "Add detail" under a group of a character sheet (bundle GAPS-1; board
 * AtlasCharacterSheet).
 *
 * Closed, it is one grey glass button. Open, it asks for the detail's name; "Add" puts the detail
 * in this place on every character's sheet in the story (S1-E17-10: a field defined once shows on
 * every sheet), and a plain message says when it didn't save (the place already has a detail with
 * that name, or anything else). "Add" waits while a save is on its way, so a double click adds one
 * detail (break test, 10 Nov 2026). The button's accessible name says
 * which group it adds to, so several on one page can be told apart.
 * Who uses it: SheetGroupSection, OwnDetailGroupSection and CustomValuesSection. What it calls:
 * useDetailChangers' addDetail and useDetailFormSave.
 */
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextInput } from '@/components/ui/TextInput';

import type { NewDetailPlace } from '../api/characterDetails';
import { useDetailFormSave } from '../hooks/useDetailFormSave';
import { useDetailChangers } from '../hooks/useDetailChangers';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/** What the form needs. */
export interface AddDetailFormProps {
  slug: string;
  /** Unique on the page: it names the box's ID. */
  id: string;
  /** Where the new detail goes. */
  place: NewDetailPlace;
  /** The group's name as the writer reads it, for the button's accessible name. */
  groupLabel: string;
}

/**
 * Renders the button, or the open form.
 *
 * @returns "Add detail", or the name box with Add and Cancel
 */
export function AddDetailForm({ slug, id, place, groupLabel }: AddDetailFormProps) {
  const { t } = useAtlasTranslation();
  const { addDetail } = useDetailChangers(slug);
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const { message, isSaving, say, save } = useDetailFormSave();

  // Opening the form puts the cursor in its box, so the keyboard carries on from the button.
  useEffect(() => {
    if (isOpen) document.getElementById(id)?.focus();
  }, [isOpen, id]);

  /** Adds the typed detail and closes, or says why not. */
  async function add() {
    if (name.trim() === '') return say(t('characters.details.nameRequired'));
    const isSaved = await save(() => addDetail({ name, ...place }), 'characters.details.failed');
    if (!isSaved) return;
    setName('');
    setIsOpen(false);
  }

  if (!isOpen) {
    return (
      <Button
        variant="secondary"
        className="self-start"
        aria-label={t('characters.details.addTo', { group: groupLabel })}
        onClick={() => setIsOpen(true)}
      >
        {t('characters.details.add')}
      </Button>
    );
  }
  return (
    <form
      className="flex min-w-0 flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        void add();
      }}
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 basis-48">
          <TextInput
            id={id}
            label={t('characters.details.name')}
            hint={t('characters.details.nameHint')}
            maxLength={60}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <Button type="submit" disabled={isSaving}>
          {t('characters.details.addConfirm')}
        </Button>
        <Button variant="secondary" onClick={() => setIsOpen(false)}>
          {t('characters.details.cancel')}
        </Button>
      </div>
      <div aria-live="polite">{message !== null && <Notice tone="error">{message}</Notice>}</div>
    </form>
  );
}
