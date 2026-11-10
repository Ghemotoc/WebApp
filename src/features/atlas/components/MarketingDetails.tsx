/**
 * MarketingDetails: the writer's own details under the launch notes, and "Add detail" (bundle
 * GAPS-2b; board AtlasMarketing, "Getting it out").
 *
 * One box per detail, in the order added, then "Add detail": a button that opens the detail's
 * name with "Add" and "Cancel". A story holds at most 12 (add_marketing_detail()). Only the writer
 * sees them, like the other marketing notes.
 * "Add" waits while a save is on its way, and a name another note or detail has is refused in plain
 * words (break test, 10 Nov 2026).
 * Who uses it: MarketingFields. What it calls: MarketingDetailItem and useStoryMarketing's
 * addDetail.
 */
import { useEffect, useState } from 'react';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextInput } from '@/components/ui/TextInput';

import { marketingDetailFailureKey } from '../api/marketing';
import { useOneAtATime } from '../hooks/useOneAtATime';
import { useFixedNoteNames, useStoryMarketing } from '../hooks/useStoryMarketing';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { MarketingDetailItem } from './MarketingDetailItem';

/** The ID of the new detail's name box, so opening the form can put the cursor in it. */
const boxId = 'atlas-marketing-add-detail-name';

/** The "Add detail" button, before its form opens. */
function AddDetailButton({ onOpen }: { onOpen: () => void }) {
  const { t } = useAtlasTranslation();
  return (
    <Button variant="secondary" className="h-9 self-start px-4 text-[13px]" onClick={onOpen}>
      <ActionIcon name="plus" size={14} />
      {t('marketing.details.add')}
    </Button>
  );
}

/** "Add detail": one button, or the open name box with Add and Cancel. */
function AddDetail({ slug }: { slug: string }) {
  const { t } = useAtlasTranslation();
  const { addDetail } = useStoryMarketing(slug);
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const { isBusy, run } = useOneAtATime();
  const isFixedNoteName = useFixedNoteNames();

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

  /** Adds the detail and closes, or says why not. */
  async function add() {
    setMessage(null);
    if (name.trim() === '') return setMessage(t('marketing.details.nameRequired'));
    if (isFixedNoteName(name)) return setMessage(t('marketing.details.nameTaken'));
    await run(() => addDetail(name))
      .then((hasRun) => hasRun && close())
      .catch((error: unknown) => setMessage(t(marketingDetailFailureKey(error, 'addFailed'))));
  }

  if (!isOpen) return <AddDetailButton onOpen={() => setIsOpen(true)} />;
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
            label={t('marketing.details.name')}
            hint={t('marketing.details.nameHint')}
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <Button type="submit" disabled={isBusy}>
          {t('marketing.details.addSubmit')}
        </Button>
        <Button variant="secondary" onClick={close}>
          {t('marketing.details.cancel')}
        </Button>
      </div>
      <div aria-live="polite">{message !== null && <Notice tone="error">{message}</Notice>}</div>
    </form>
  );
}

/**
 * Renders the details and "Add detail".
 *
 * @param props.slug - the story's address
 * @returns one box per detail, then the button or its form
 */
export function MarketingDetails({ slug }: { slug: string }) {
  const { details } = useStoryMarketing(slug);
  return (
    <>
      {details.map((detail) => (
        <MarketingDetailItem key={detail.id} slug={slug} detail={detail} />
      ))}
      <AddDetail slug={slug} />
    </>
  );
}
