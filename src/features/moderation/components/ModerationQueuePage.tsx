/**
 * ModerationQueuePage: /staff/moderation, the report queue (story S1-E10-03a; architecture 1.8.4,
 * screen 8.2; the tiers decided 23 Oct 2026, Q5).
 *
 * Board (Moderation): "Report queue", the intro, the four tier cards, the filters and the list,
 * most urgent first. Not in part a: search, the reason and claimed filters, claiming, the side
 * panel, the picture-check panel and the removal-order banner (S1-E10-03b, S1-E10-05, S1-E10-09).
 * Plain components, no doodles (staff screens).
 * Who shows it: the router, inside StaffLayout. The database refuses anyone outside moderation
 * staff (admin_moderation_queue()), and the page says so; a safeguarding case is left out for
 * staff without the permission (Q6), by the same function.
 * What it calls: useModerationQueue and useOpenCases → api/moderationQueue.ts.
 */
import { useTranslation } from 'react-i18next';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import { useModerationQueue, useOpenCases } from '../hooks/useModerationQueue';
import { registerModerationTranslations } from '../registerModerationTranslations';

import { CaseList } from './CaseList';
import { PublicNoticesPanel } from './PublicNoticesPanel';
import { QueueFilters } from './QueueFilters';
import { TierSummary } from './TierSummary';

/**
 * What goes under the heading: a refusal, an error, or the summary, filters and list.
 *
 * @param props.queue - useModerationQueue's result
 * @returns the page's body
 */
function QueueBody({ queue }: { queue: ReturnType<typeof useModerationQueue> }) {
  const { t } = useTranslation('moderation');
  const openCases = useOpenCases();
  if (queue.loadFailure === 'not_allowed') {
    return <p className="m-0 text-body">{t('queue.notAllowed')}</p>;
  }
  if (queue.loadFailure !== null) {
    return <Notice tone="error">{t(`failures.${queue.loadFailure}`)}</Notice>;
  }
  return (
    <>
      <TierSummary openCases={openCases} />
      <PublicNoticesPanel />
      <QueueFilters filters={queue.filters} onChange={queue.setFilters} />
      <CaseList cases={queue.cases} isLoading={queue.isLoading} />
    </>
  );
}

/**
 * Renders the page.
 *
 * @returns the Report queue screen
 */
export function ModerationQueuePage() {
  const { i18n } = useTranslation();
  registerModerationTranslations(i18n);
  const { t } = useTranslation('moderation');
  const queue = useModerationQueue();
  return (
    <PageContainer className="flex flex-col gap-6 pt-12 pb-7">
      <title>{t('queue.documentTitle')}</title>
      <div className="flex max-w-[720px] flex-col gap-2">
        <Eyebrow>{t('queue.eyebrow')}</Eyebrow>
        <h1 className="m-0 font-heading text-[34px] font-bold text-heading">
          {t('queue.heading')}
        </h1>
        <p className="m-0 text-body">{t('queue.intro')}</p>
      </div>
      <QueueBody queue={queue} />
    </PageContainer>
  );
}
