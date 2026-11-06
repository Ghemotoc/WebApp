/**
 * AccountStaffHistory: the account page's "Staff actions on @username" section: everything staff
 * have done about this account, newest first, 20 to a page (bundle LOGS-1, part b; it replaces
 * the 10 newest rows S1-E11-02 showed).
 *
 * Who shows it: AccountPage, for owner and admin (the roles that may read the audit log,
 * architecture 1.8.3). What it calls: hooks/useAccountStaffHistory.ts.
 * Each row says when, who, what and the reason given. The before and after values stay on the
 * Audit log page, which the link at the bottom opens already filtered to this account.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Notice } from '@/components/ui/Notice';

import type { AuditLogEntry } from '../../api/auditLog';
import { useAccountStaffHistory } from '../../hooks/useAccountStaffHistory';
import { useAccountWords } from '../../hooks/useAccountWords';

import { AccountPager } from './AccountPager';

/**
 * One row: "6 Nov 2026, 07:10 · @admin · account.note_added", then the reason.
 *
 * @returns the list item
 */
function HistoryRow({ row }: { row: AuditLogEntry }) {
  const { t } = useTranslation('staff');
  const words = useAccountWords();
  return (
    <li className="text-body [overflow-wrap:anywhere]">
      {t('users.audit.line', {
        when: words.dateTime(row.createdAt),
        who: row.staffHandle === null ? t('auditLog.system') : `@${row.staffHandle}`,
        action: row.action,
      })}
      {row.reason !== null && <span className="text-meta">{` · ${row.reason}`}</span>}
    </li>
  );
}

/** What the section needs from the page. */
interface AccountStaffHistoryProps {
  userId: string;
  handle: string;
}

/**
 * The section: heading, the page of rows, the pager and the link to the full audit log.
 *
 * @returns the section
 */
export function AccountStaffHistory({ userId, handle }: AccountStaffHistoryProps) {
  const { t } = useTranslation('staff');
  const history = useAccountStaffHistory(userId);
  const isEmptyFirstPage = history.pageNumber === 1 && history.rows.length === 0;
  const isEmptyLaterPage = history.pageNumber > 1 && history.rows.length === 0;
  return (
    <section aria-labelledby="account-audit-heading" className="flex flex-col gap-3">
      <h2
        id="account-audit-heading"
        className="m-0 font-heading text-[24px] font-bold text-heading"
      >
        {t('users.audit.heading', { handle })}
      </h2>
      {history.failure !== null && (
        <Notice tone="error">{t(`users.audit.failures.${history.failure}`)}</Notice>
      )}
      {!history.isLoading && history.failure === null && isEmptyFirstPage && (
        <p className="m-0 text-body">{t('users.audit.none')}</p>
      )}
      {!history.isLoading && isEmptyLaterPage && (
        <p className="m-0 text-body">{t('users.audit.noMore')}</p>
      )}
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {history.rows.map((row) => (
          <HistoryRow key={row.id} row={row} />
        ))}
      </ul>
      <AccountPager
        label={t('users.audit.pages')}
        pageNumber={history.pageNumber}
        pageCount={null}
        hasNextPage={history.hasNextPage}
        onShowPage={history.showPage}
      />
      <p className="m-0 text-sm text-meta">
        <Link
          to={`/staff/audit-log?target=${encodeURIComponent(userId)}`}
          className="text-link underline"
        >
          {t('users.audit.more')}
        </Link>
      </p>
    </section>
  );
}
