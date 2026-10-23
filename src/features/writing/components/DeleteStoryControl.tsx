/**
 * DeleteStoryControl: "Delete this story", asked twice, with undo (story S1-E3-05; board
 * Chapters 4.4, "The whole story").
 *
 * The four steps on the board: (0) "Delete story" with "We ask you twice…"; (1) an alert:
 * "Delete “<title>” and all N chapters? Readers lose access straight away." with Keep story /
 * Yes, delete story; (2) "Last check. We hide the story now and delete it for good on <date>.
 * You can undo until then." with Keep story / Delete story; (3) a status: "Story deleted. It’s
 * hidden from readers and will be gone for good on <date>." with Undo.
 * Rules: two confirmations; hidden at once; 30 days of undo (content_purge_days); then the
 * nightly purge (S1-E3-05). Chapters follow the story (S1-E3-02a extends the function).
 * Who uses it: StorySettingsPage. What it calls: useStoryActions → delete_my_story(),
 * restore_my_story().
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import type { MyStory } from '../api/stories';
import { purgeDateFor } from '../lib/purgeDate';
import { useStoryActions } from '../hooks/useStoryActions';

/** Which of the four steps is on screen. */
type Step = 'idle' | 'first' | 'second';

/** Steps 1 and 2 of the board: the question, then the last check. */
function ConfirmSteps({
  story,
  isLast,
  purgeDate,
  isDeleting,
  onKeep,
  onConfirm,
}: {
  story: MyStory;
  isLast: boolean;
  purgeDate: string;
  isDeleting: boolean;
  onKeep: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation('writing');
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-2xl border border-(--error-border) bg-(--error-bg) p-4 text-sm text-(--error-text)"
    >
      <p className="m-0">
        <strong>
          {isLast
            ? t('deleteStory.lastCheckTitle')
            : t('deleteStory.firstTitle', { title: story.title })}
        </strong>{' '}
        {isLast ? t('deleteStory.lastCheckBody', { date: purgeDate }) : t('deleteStory.firstBody')}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={onKeep}>
          {t('deleteStory.keep')}
        </Button>
        <Button variant="destructive" disabled={isDeleting} onClick={onConfirm}>
          {isLast ? t('deleteStory.confirmLast') : t('deleteStory.confirmFirst')}
        </Button>
      </div>
    </div>
  );
}

/**
 * Renders the control for a story (deleted or not).
 *
 * @returns the card's contents
 */
export function DeleteStoryControl({ story }: { story: MyStory }) {
  const { t, i18n } = useTranslation('writing');
  const [step, setStep] = useState<Step>('idle');
  const { deleteStory, restoreStory } = useStoryActions();
  const purgeDate = purgeDateFor(story.deletedAt ?? new Date().toISOString(), i18n.language);

  // Step 3 of the board: the story is deleted; offer undo until the purge date.
  if (story.deletedAt !== null) {
    return (
      <div className="flex flex-col gap-3">
        <Notice tone="info">{t('deleteStory.deleted', { date: purgeDate })}</Notice>
        <div>
          <Button
            variant="secondary"
            onClick={() => restoreStory.mutate(story.slug)}
            disabled={restoreStory.isPending}
          >
            {t('deleteStory.undo')}
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'idle') {
    return (
      <div className="flex flex-col gap-3">
        <p className="m-0 text-sm text-body">{t('deleteStory.intro')}</p>
        <div>
          <Button variant="destructive" onClick={() => setStep('first')}>
            {t('deleteStory.button')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ConfirmSteps
      story={story}
      isLast={step === 'second'}
      purgeDate={purgeDate}
      isDeleting={deleteStory.isPending}
      onKeep={() => setStep('idle')}
      onConfirm={() => (step === 'second' ? deleteStory.mutate(story.slug) : setStep('second'))}
    />
  );
}
