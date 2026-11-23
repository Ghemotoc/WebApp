/**
 * AgeCheckResultSummary: "Age confirmed: 18 or over", with the date and the method (story
 * S1-E2-08, part 08a; board AgeCheck.dc.html, "Passed").
 *
 * Who shows it: AgeCheckPage (when the check is already done) and AgeCheckReturnPage (after a
 * pass). What it calls: nothing; it shows the stored result, its date on the viewer's own calendar and its
 * method. Only these three are ever kept (criterion 5; CLAUDE.md rule 5).
 */
import { useTranslation } from 'react-i18next';

import { formatLocalDate } from '@/lib/local-time';

import type { MyAgeCheck } from '../api/ageCheck';

/**
 * Renders the summary.
 *
 * @param props.check - the person's check, with a "13 or over" or "18 or over" result
 * @returns the result block
 */
export function AgeCheckResultSummary({ check }: { check: MyAgeCheck }) {
  const { t, i18n } = useTranslation('account');
  // The date and method line, only when both are known.
  const date =
    check.checkedAt === null ? null : formatLocalDate(new Date(check.checkedAt), i18n.language);
  const method = check.method === null ? null : t(`ageCheck.methods.${check.method}`);

  return (
    <div className="flex flex-col gap-2 rounded-card border border-border bg-tint p-4">
      <h2 className="m-0 font-heading type-heading font-bold text-ink-heading">
        {t('ageCheck.confirmed', { result: t(`ageCheck.results.${check.result}`) })}
      </h2>
      {date !== null && method !== null ? (
        <p className="m-0 type-body text-ink-muted">
          {t('ageCheck.confirmedMeta', { date, method })}
        </p>
      ) : null}
      {/* Yoti deletes the selfie after the check; we never had it. */}
      {check.method === 'facial_estimation' ? (
        <p className="m-0 text-ink-muted">{t('ageCheck.photoDeleted')}</p>
      ) : null}
    </div>
  );
}
