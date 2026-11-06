/**
 * AppealsPage: /staff/appeals, appeals against moderation decisions (story S1-E10-07; DSA art.
 * 20; architecture 1.8.2 "Appeals and orders", screen 8.4).
 *
 * Open appeals first by default, oldest first; a filter shows decided ones too. Plain components,
 * no doodles (staff screens).
 * Who shows it: the router, inside StaffLayout; the menu shows it to roles with the appeals area
 * (owner, admin, moderator). The database refuses everyone else, and the page says so.
 * What it calls: useAppeals → api/appeals.ts.
 */
import { useTranslation } from 'react-i18next';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { Select } from '@/components/ui/Select';

import type { AppealStatus } from '../api/appeals';
import { useAppeals } from '../hooks/useAppeals';
import { registerModerationTranslations } from '../registerModerationTranslations';

import { AppealCard } from './AppealCard';

/**
 * The list, or why there is none.
 *
 * @returns the list part of the page
 */
function AppealsList({ state }: { state: ReturnType<typeof useAppeals> }) {
  const { t } = useTranslation('moderation');
  if (state.loadFailure === 'not_allowed')
    return <p className="m-0 text-body">{t('appeals.notAllowed')}</p>;
  if (state.loadFailure !== null)
    return <Notice tone="error">{t(`failures.${state.loadFailure}`)}</Notice>;
  if (state.isLoading) return <p className="m-0 text-meta">{t('appeals.loading')}</p>;
  if (state.appeals.length === 0) return <p className="m-0 text-body">{t('appeals.none')}</p>;
  return (
    <ul className="m-0 flex list-none flex-col gap-4 p-0" aria-label={t('appeals.listLabel')}>
      {state.appeals.map((appeal) => (
        <AppealCard
          key={appeal.id}
          appeal={appeal}
          isDeciding={state.isDeciding}
          onDecide={state.decide}
          isMarking={state.isMarking}
          onMarkReviewed={state.markReviewed}
        />
      ))}
    </ul>
  );
}

/**
 * Renders the page.
 *
 * @returns the Appeals screen
 */
export function AppealsPage() {
  const { i18n } = useTranslation();
  registerModerationTranslations(i18n);
  const { t } = useTranslation('moderation');
  const state = useAppeals();
  return (
    <PageContainer className="flex flex-col gap-6 pt-12 pb-7">
      <title>{t('appeals.documentTitle')}</title>
      <div className="flex max-w-[720px] flex-col gap-2">
        <Eyebrow>{t('queue.eyebrow')}</Eyebrow>
        <h1 className="m-0 font-heading text-[34px] font-bold text-heading">
          {t('appeals.heading')}
        </h1>
        <p className="m-0 text-body">{t('appeals.intro')}</p>
      </div>
      <Select
        id="appeals-status"
        label={t('appeals.statusFilter')}
        isLabelVisible
        value={state.status}
        onChange={(value) => state.setStatus(value as AppealStatus | '')}
        options={[
          { value: 'open', label: t('appeals.statuses.open') },
          { value: 'upheld', label: t('appeals.statuses.upheld') },
          { value: 'overturned', label: t('appeals.statuses.overturned') },
          { value: '', label: t('appeals.statuses.all') },
        ]}
      />
      {state.decideFailure !== null && (
        <Notice tone="error">{t(`failures.${state.decideFailure}`)}</Notice>
      )}
      {state.markFailure !== null && (
        <Notice tone="error">{t(`failures.${state.markFailure}`)}</Notice>
      )}
      <AppealsList state={state} />
    </PageContainer>
  );
}
