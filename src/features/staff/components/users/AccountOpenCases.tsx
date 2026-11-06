/**
 * The account page's "Open cases" list, each a link to its case page (story S1-E11-02; board
 * AdminUsers 8.5). The staff history that sat beside it is now AccountStaffHistory (LOGS-1b).
 *
 * Who shows it: AccountPage. What it reads: useAccount's openCases (moderation staff only; a
 * safeguarding case only with the permission).
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import type { AccountOpenCase } from '../../api/userManagement';
import { useAccountWords } from '../../hooks/useAccountWords';

/** The shared heading style of the account page's sections. */
const sectionHeading = 'm-0 font-heading text-[24px] font-bold text-heading';

/**
 * "Open cases".
 *
 * @param props.cases - the cases the caller may see
 * @returns the section
 */
export function AccountOpenCases({ cases }: { cases: AccountOpenCase[] }) {
  const { t } = useTranslation('staff');
  const { t: tModeration } = useTranslation('moderation');
  const words = useAccountWords();
  return (
    <section aria-labelledby="account-cases-heading" className="flex flex-col gap-3">
      <h2 id="account-cases-heading" className={sectionHeading}>
        {t('users.cases.heading')}
      </h2>
      {cases.length === 0 && <p className="m-0 text-body">{t('users.cases.none')}</p>}
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {cases.map((openCase) => (
          <li key={openCase.caseId} className="flex flex-wrap items-baseline gap-x-2">
            <Link
              to={`/staff/moderation/cases/${openCase.caseId}`}
              className="font-semibold text-link underline"
              aria-label={tModeration('queue.open', { reference: openCase.reference })}
            >
              {openCase.reference}
            </Link>
            <span className="text-body">
              {t('users.cases.line', {
                reason:
                  openCase.topReason === null
                    ? t('users.cases.noReason')
                    : tModeration(`reasons.${openCase.topReason}`),
                tier: tModeration(`tiers.${openCase.tier}`),
                deadline: words.date(openCase.deadlineAt),
              })}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
