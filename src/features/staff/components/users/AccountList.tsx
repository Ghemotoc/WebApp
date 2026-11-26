/**
 * AccountList: the full list of accounts under the Users search, newest first, 50 a page (Robert,
 * 26 Nov 2026: "I actually want to be able to see the full list of users in the backend").
 *
 * Who shows it: UsersPage. What it calls: useAccountList (admin_list_accounts(), owner and admins
 * only; each page read is logged) and draws the rows with AccountListTable and the pages with
 * AccountPager. For moderators and support the database refuses the list, so nothing is drawn:
 * the search above is theirs.
 */
import { useTranslation } from 'react-i18next';

import { Notice } from '@/components/ui/Notice';

import { useAccountList } from '../../hooks/useAccountList';

import { AccountListTable } from './AccountListTable';
import { AccountPager } from './AccountPager';

/**
 * Renders the section.
 *
 * @returns the heading, the count, any failure, the rows and the pager; nothing when the role may
 *   not see the list
 */
export function AccountList() {
  const { t } = useTranslation('staff');
  const list = useAccountList();
  // Step 1: a role the database refuses sees no section at all.
  if (!list.isAllowed) return null;
  return (
    <section aria-labelledby="users-list-heading" className="flex flex-col gap-3">
      <h2 id="users-list-heading" className="m-0 font-heading text-[24px] font-bold text-heading">
        {t('users.list.heading')}
      </h2>
      <p className="m-0 text-body">{t('users.list.intro')}</p>
      {/* Step 2: the count, once known, read out when it changes. */}
      <p role="status" className="m-0 text-sm text-meta">
        {list.isLoading
          ? t('users.list.loading')
          : t('users.list.count', { count: list.totalCount })}
      </p>
      {/* Step 3: what went wrong, in plain words. */}
      {list.readFailure !== null && (
        <Notice tone="error">{t(`users.failures.${list.readFailure}`)}</Notice>
      )}
      {list.emailFailed && <Notice tone="error">{t('users.list.emailFailed')}</Notice>}
      {/* Step 4: the rows and the pages. */}
      {list.accounts.length > 0 && (
        <AccountListTable
          accounts={list.accounts}
          shownEmails={list.shownEmails}
          onShowEmail={list.showEmail}
        />
      )}
      <AccountPager
        label={t('users.list.pagerLabel')}
        pageNumber={list.pageNumber}
        pageCount={list.pageCount}
        hasNextPage={list.pageNumber < list.pageCount}
        onShowPage={list.showPage}
      />
    </section>
  );
}
