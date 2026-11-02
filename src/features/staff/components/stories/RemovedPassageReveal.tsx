/**
 * RemovedPassageReveal: "Show the removed words" on a version that removed a passage (bundle
 * ADMIN-2, part b2; story S1-E11-08 criterion "the original stays in the version history,
 * visible only to staff working on that case").
 *
 * The words load only when staff press the button, because reading them is a sensitive read the
 * database logs (architecture 1.8.3). Staff without the right (support, or anyone without the
 * safeguarding permission for a safeguarding case) get a plain message instead.
 * Who shows it: StoryVersionItem, for staff who may change stories. What it calls:
 * api/staffStoryHistory.ts fetchRemovedPassage().
 */
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import { fetchRemovedPassage } from '../../api/staffStoryHistory';
import { requireStaffClient } from '../../hooks/requireStaffClient';

/**
 * Renders the button, then the words.
 *
 * @param props.versionId - the version that removed the passage
 * @returns the button, the words or why they can't be shown
 */
export function RemovedPassageReveal({ versionId }: { versionId: string }) {
  const { t } = useTranslation('staff');
  const reveal = useMutation({
    mutationFn: async () => fetchRemovedPassage(await requireStaffClient(), versionId),
  });
  if (reveal.data !== undefined) {
    return (
      <div className="flex flex-col gap-1">
        <p className="m-0 text-sm font-semibold text-ink">{t('stories.history.passageLabel')}</p>
        <blockquote className="m-0 border-l-4 border-border pl-3 whitespace-pre-wrap text-body">
          {reveal.data.text}
        </blockquote>
        {reveal.data.caseReference !== null && (
          <p className="m-0 text-sm text-meta">
            {t('stories.history.passageCase', { reference: reveal.data.caseReference })}
          </p>
        )}
        <p className="m-0 text-sm text-meta">{t('stories.history.passageLogged')}</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <div>
        <Button variant="secondary" disabled={reveal.isPending} onClick={() => reveal.mutate()}>
          {t('stories.history.showPassage')}
        </Button>
      </div>
      {reveal.isError && <Notice tone="error">{t('stories.history.passageFailed')}</Notice>}
    </div>
  );
}
