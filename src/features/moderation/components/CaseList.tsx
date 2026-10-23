/**
 * CaseList: "Cases", the list the filters leave (story S1-E10-03a; board 8.2's "Open cases").
 *
 * Who shows it: ModerationQueuePage. What it shows: one CaseRow per case, most urgent first (the
 * database orders them), and a plain note while loading or when nothing matches.
 */
import { useTranslation } from 'react-i18next';

import type { QueueCase } from '../api/moderationQueue';

import { CaseRow } from './CaseRow';

/** What the list needs. */
interface CaseListProps {
  cases: QueueCase[];
  isLoading: boolean;
}

/**
 * Renders the list.
 *
 * @returns the section with its heading, the count line and the rows
 */
export function CaseList({ cases, isLoading }: CaseListProps) {
  const { t } = useTranslation('moderation');
  return (
    <section aria-labelledby="cases-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="cases-heading" className="m-0 font-heading text-[24px] font-bold text-heading">
          {t('queue.listHeading')}
        </h2>
        <p className="m-0 text-sm text-meta">{t('queue.grouped')}</p>
      </div>
      {isLoading && <p className="m-0 text-meta">{t('queue.loading')}</p>}
      {!isLoading && cases.length === 0 && <p className="m-0 text-body">{t('queue.none')}</p>}
      {!isLoading && cases.length > 0 && (
        <p className="m-0 text-sm text-meta">{t('queue.showing', { count: cases.length })}</p>
      )}
      <ul className="m-0 flex list-none flex-col gap-4 p-0">
        {cases.map((theCase) => (
          <CaseRow key={theCase.id} theCase={theCase} />
        ))}
      </ul>
    </section>
  );
}
