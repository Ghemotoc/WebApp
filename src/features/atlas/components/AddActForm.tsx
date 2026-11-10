/**
 * AddActForm: "Add act" beside the chapter board's hint (bundle GAPS-2a; board AtlasStoryline).
 *
 * One button; pressed, it opens a small form with the act's name, "Add" and "Cancel". The new act
 * comes after the story's other acts, as a column before "No act". A story holds at most 12 acts
 * (add_plan_act()); "Add" waits while a save is on its way and a name another act has is refused in
 * plain words (break test, 10 Nov 2026). Who uses it: StorylinePage, on the Board view. What it calls: useStoryline's
 * addAct.
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

/** The ID of the name box, so opening the form can put the cursor in it. */
const boxId = 'atlas-add-act-name';

/**
 * Renders the button or the open form.
 *
 * @param props.slug - the story's address
 * @returns "Add act", or the form with its message
 */
export function AddActForm({ slug }: { slug: string }) {
  const { t } = useAtlasTranslation();
  const { addAct } = useStoryline(slug);
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const { isBusy, run } = useOneAtATime();

  // Opening the form puts the cursor in its box, so the keyboard carries on from the button.
  useEffect(() => {
    if (isOpen) document.getElementById(boxId)?.focus();
  }, [isOpen]);

  /** Closes the form and empties it. */
  function close() {
    setIsOpen(false);
    setName('');
    setMessage(null);
  }

  /** Adds the act and closes, or says why not. */
  async function add() {
    setMessage(null);
    if (name.trim() === '') return setMessage(t('storyline.board.acts.nameRequired'));
    await run(() => addAct(name))
      .then((hasRun) => hasRun && close())
      .catch((error: unknown) => setMessage(t(actFailureKey(error, 'addFailed'))));
  }

  if (!isOpen) {
    return (
      <Button variant="secondary" className="h-9 px-4 text-[13px]" onClick={() => setIsOpen(true)}>
        <ActionIcon name="plus" size={14} />
        {t('storyline.board.acts.add')}
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
            id={boxId}
            label={t('storyline.board.acts.name')}
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <Button type="submit" disabled={isBusy}>
          {t('storyline.board.acts.addSubmit')}
        </Button>
        <Button variant="secondary" onClick={close}>
          {t('storyline.board.acts.cancel')}
        </Button>
      </div>
      <div aria-live="polite">{message !== null && <Notice tone="error">{message}</Notice>}</div>
    </form>
  );
}
