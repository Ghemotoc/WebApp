/**
 * MyDataRequestsSection: "Data requests" on Settings (id data-requests): the person's own requests
 * to see, move, correct or delete their data, when we'll answer, and the "Was it you?" question
 * the team asks about a request that came by email or post (bundle ADMIN-2, part c1; story
 * S1-E11-09 criterion 4; GDPR art. 12(3) and 12(6)).
 *
 * It shows only once the person has a request, so Settings stays short for everyone else. The
 * notices data_request_confirm and data_request_extended link here.
 * Who shows it: SettingsPage. What it calls: useMyDataRequests → api/myDataRequests.ts.
 * No doodles: it is about the person's rights, read with care.
 */
import { Notice } from '@/components/ui/Notice';

import { useMyDataRequests } from '../hooks/useMyDataRequests';
import { useDataRequestsTranslation } from '../registerDataRequestsTranslations';

import { MyDataRequestRow } from './MyDataRequestRow';

/**
 * Renders the section, or nothing while the person has no requests.
 *
 * @returns the section
 */
export function MyDataRequestsSection() {
  const { t } = useDataRequestsTranslation();
  const mine = useMyDataRequests();
  if (!mine.loadFailed && mine.requests.length === 0) return null;
  return (
    <section
      id="data-requests"
      aria-labelledby="settings-data-requests-heading"
      className="flex scroll-mt-24 flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-card"
    >
      <h2
        id="settings-data-requests-heading"
        className="m-0 font-heading text-[22px] font-bold text-heading"
      >
        {t('mine.heading')}
      </h2>
      <p className="m-0 text-body">{t('mine.intro')}</p>
      {mine.loadFailed && <Notice tone="error">{t('mine.loadFailed')}</Notice>}
      {mine.answerFailure !== null && (
        <Notice tone="error">
          {mine.answerFailure === 'not_waiting' ? t('mine.notWaiting') : t('mine.answerFailed')}
        </Notice>
      )}
      <ul className="m-0 flex list-none flex-col p-0">
        {mine.requests.map((request) => (
          <MyDataRequestRow
            key={request.reference}
            request={request}
            isAnswering={mine.isAnswering}
            onAnswer={(isMine) => mine.answer({ reference: request.reference, isMine })}
          />
        ))}
      </ul>
    </section>
  );
}
