/**
 * EditActForm: "Edit act" under an act's name on the chapter board (bundle GAPS-2a).
 *
 * One button; pressed, it opens the act's name with "Save" and "Cancel", and "Delete act".
 * Deleting asks first, in place, and says how many chapters stay in the book under "No act": no
 * chapter is deleted and none changes place, so readers see nothing different
 * (delete_plan_act()). Who uses it: BoardColumnSection, on every act (never on "No act"). What it
 * calls: useStoryline's renameAct and deleteAct.
 */
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextInput } from '@/components/ui/TextInput';

import { useStoryline } from '../hooks/useStoryline';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/** What the form needs. */
export interface EditActFormProps {
  slug: string;
  act: { id: string; name: string };
  /** How many chapters the act holds, for the question before deleting. */
  chapterCount: number;
}

/** "Delete act", then the question with "Delete act" and "Keep act". */
function DeleteAct({
  act,
  chapterCount,
  onDelete,
}: Pick<EditActFormProps, 'act' | 'chapterCount'> & { onDelete: () => void }) {
  const { t } = useAtlasTranslation();
  const [isAsking, setIsAsking] = useState(false);
  if (!isAsking) {
    return (
      <Button variant="secondary" className="self-start" onClick={() => setIsAsking(true)}>
        {t('storyline.board.acts.delete')}
      </Button>
    );
  }
  return (
    <div role="group" aria-label={t('storyline.board.acts.delete')} className="flex flex-col gap-2">
      <p className="m-0 text-sm text-body">
        {chapterCount === 0
          ? t('storyline.board.acts.deleteQuestionEmpty', { name: act.name })
          : t('storyline.board.acts.deleteQuestion', { name: act.name, count: chapterCount })}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setIsAsking(false)}>
          {t('storyline.board.acts.keep')}
        </Button>
        <Button variant="destructive" onClick={onDelete}>
          {t('storyline.board.acts.delete')}
        </Button>
      </div>
    </div>
  );
}

/** "Edit act", named after its act for a screen reader ("Edit act: Act I"). */
function EditActButton({ name, onOpen }: { name: string; onOpen: () => void }) {
  const { t } = useAtlasTranslation();
  return (
    <Button
      variant="secondary"
      className="h-8 self-start px-3 text-xs"
      aria-label={t('storyline.board.acts.editNamed', { name })}
      onClick={onOpen}
    >
      {t('storyline.board.acts.edit')}
    </Button>
  );
}

/**
 * Renders the button or the open form.
 *
 * @returns "Edit act", or the name box with Save, Cancel and Delete act
 */
export function EditActForm({ slug, act, chapterCount }: EditActFormProps) {
  const { t } = useAtlasTranslation();
  const { renameAct, deleteAct } = useStoryline(slug);
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(act.name);
  const [message, setMessage] = useState<string | null>(null);

  const boxId = `atlas-edit-act-${act.id}`;
  // Opening the form puts the cursor in its box, so the keyboard carries on from the button.
  useEffect(() => {
    if (isOpen) document.getElementById(boxId)?.focus();
  }, [isOpen, boxId]);

  /** Saves the new name and closes, or says why not. */
  async function save() {
    setMessage(null);
    if (name.trim() === '') return setMessage(t('storyline.board.acts.nameRequired'));
    await renameAct(act.id, name)
      .then(() => setIsOpen(false))
      .catch(() => setMessage(t('storyline.board.acts.saveFailed')));
  }

  /** Deletes the act (the column goes with it), or says why not. */
  function remove() {
    setMessage(null);
    deleteAct(act.id).catch(() => setMessage(t('storyline.board.acts.deleteFailed')));
  }

  if (!isOpen) {
    return (
      <EditActButton
        name={act.name}
        onOpen={() => {
          setName(act.name);
          setIsOpen(true);
        }}
      />
    );
  }
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <form
        className="flex min-w-0 flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <TextInput
          id={boxId}
          label={t('storyline.board.acts.name')}
          maxLength={80}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="submit">{t('storyline.board.acts.save')}</Button>
          <Button variant="secondary" onClick={() => setIsOpen(false)}>
            {t('storyline.board.acts.cancel')}
          </Button>
        </div>
      </form>
      <DeleteAct act={act} chapterCount={chapterCount} onDelete={remove} />
      <div aria-live="polite">{message !== null && <Notice tone="error">{message}</Notice>}</div>
    </div>
  );
}
