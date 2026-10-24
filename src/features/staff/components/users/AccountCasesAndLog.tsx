/**
 * The account page's two lists (story S1-E11-02; board AdminUsers 8.5): "Open cases" (each a link
 * to its case page) and "Staff actions on @username" (the newest audit rows about the account).
 *
 * Who shows them: AccountPage. What they read: useAccount's openCases (moderation staff only;
 * a safeguarding case only with the permission) and auditRows (owner and admin only, the roles
 * that may read the audit log, architecture 1.8.3).
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import type { AuditLogEntry } from '../../api/auditLog';
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

/**
 * "Staff actions on @username": the newest audit rows, with a pointer to the Audit log page.
 *
 * @param props.handle - the account's username, for the heading
 * @param props.rows - the newest rows about the account
 * @returns the section
 */
export function AccountAuditRows({ handle, rows }: { handle: string; rows: AuditLogEntry[] }) {
  const { t } = useTranslation('staff');
  const words = useAccountWords();
  return (
    <section aria-labelledby="account-audit-heading" className="flex flex-col gap-3">
      <h2 id="account-audit-heading" className={sectionHeading}>
        {t('users.audit.heading', { handle })}
      </h2>
      {rows.length === 0 && <p className="m-0 text-body">{t('users.audit.none')}</p>}
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {rows.map((row) => (
          <li key={row.id} className="text-body [overflow-wrap:anywhere]">
            {t('users.audit.line', {
              when: words.date(row.createdAt),
              who: row.staffHandle === null ? t('auditLog.system') : `@${row.staffHandle}`,
              action: row.action,
            })}
            {row.reason !== null && <span className="text-meta">{` · ${row.reason}`}</span>}
          </li>
        ))}
      </ul>
      <p className="m-0 text-sm text-meta">
        <Link to="/staff/audit-log" className="text-link underline">
          {t('users.audit.more')}
        </Link>
      </p>
    </section>
  );
}
