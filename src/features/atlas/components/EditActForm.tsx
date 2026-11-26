/**
 * EditActForm: "Edit act" beside an act's name on the chapter board (bundle GAPS-2a; a round pen
 * button since story 6.9, board E28, which draws the act's name and count alone).
 *
 * One button; pressed, it opens the act's name with "Save" and "Cancel", and "Delete act".
 * Deleting asks first, in place, and says how many chapters stay in the book under "No act": no
 * chapter is deleted and none changes place, so readers see nothing different
 * (delete_plan_act()). One change runs at a time, and a name another act has is refused in plain
 * words (break test, 10 Nov 2026). Who uses it: BoardColumnSection, on every act (never on "No act"). What it
 * calls: useStoryline's renameAct and deleteAct.
 */
import { useEffect, useState } from 'react';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextInput } from '@/components/ui/TextInput';

import { actFailureKey } from '../api/storyline';
import { useOneAtATime } from '../hooks/useOneAtATime';
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
      <p className="m-0 type-body text-ink-muted">
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

/** "Edit act": a round pen button named after its act ("Edit act: Act I", WCAG 4.1.2). */
function EditActButton({ name, onOpen }: { name: string; onOpen: () => void }) {
  const { t } = useAtlasTranslation();
  const label = t('storyline.board.acts.editNamed', { name });
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onOpen}
      className="tmc-focus grid size-11 flex-none cursor-pointer place-items-center rounded-full border-0 bg-transparent text-ink-muted hover:bg-surface hover:text-ink-heading"
    >
      <ActionIcon name="pen" size={16} />
    </button>
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
  const { isBusy, run } = useOneAtATime();

  const boxId = `atlas-edit-act-${act.id}`;
  // Opening the form puts the cursor in its box, so the keyboard carries on from the button.
  useEffect(() => {
    if (isOpen) document.getElementById(boxId)?.focus();
  }, [isOpen, boxId]);

  /** Saves the new name and closes, or says why not. */
  async function save() {
    setMessage(null);
    if (name.trim() === '') return setMessage(t('storyline.board.acts.nameRequired'));
    await run(() => renameAct(act.id, name))
      .then((hasRun) => hasRun && setIsOpen(false))
      .catch((error: unknown) => setMessage(t(actFailureKey(error, 'saveFailed'))));
  }

  /** Deletes the act (the column goes with it), or says why not. */
  function remove() {
    setMessage(null);
    run(() => deleteAct(act.id)).catch(() => setMessage(t('storyline.board.acts.deleteFailed')));
  }

  /** Opens the form with the act's name as it is now. */
  function open() {
    setName(act.name);
    setIsOpen(true);
  }

  if (!isOpen) return <EditActButton name={act.name} onOpen={open} />;
  return (
    // The open form takes the whole row under the act's name.
    <div className="flex min-w-0 basis-full flex-col gap-3">
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
          <Button type="submit" disabled={isBusy}>
            {t('storyline.board.acts.save')}
          </Button>
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
