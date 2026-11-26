/**
 * AccountListFilters: the Status and Per page drop-downs above the Members list in Staff › Users
 * (S1-E11-02 follow-up; Robert, 26 Nov 2026, 20:17 UTC: "add a filter to see who's active, who's
 * banned, and so on … one of those that show you how many do you want to see per page").
 *
 * Status lists every account state account_state() knows, active, suspended and banned first;
 * "Any status" (the default) leaves deleted accounts out, and "Deleted" finds them, so nothing is
 * lost. Per page offers 5 (the default), 10, 25 and 50. Each drop-down is only as wide as its
 * longest option (DoD drop-down rule); staff screens keep their plain look.
 * Who shows it: AccountList. It holds no state: it shows the choices it is given and passes
 * changes up to useAccountList, which keeps them in the page address.
 */
import { useTranslation } from 'react-i18next';

import { Select } from '@/components/ui/Select';
import type { Enums } from '@/lib/database.types';

import {
  accountListPageSizes,
  accountStatusFilters,
  type AccountListPageSize,
} from '../../api/accountList';
import { useAccountWords } from '../../hooks/useAccountWords';

/** What the drop-downs need. */
interface AccountListFiltersProps {
  status: Enums<'account_status'> | null;
  pageSize: AccountListPageSize;
  onStatusChange: (status: Enums<'account_status'> | null) => void;
  onPageSizeChange: (pageSize: AccountListPageSize) => void;
}

/** The drop-down value that stands for "any status but deleted". */
const anyStatusValue = '';

/**
 * Renders the two drop-downs side by side.
 *
 * @returns the filter row
 */
export function AccountListFilters({
  status,
  pageSize,
  onStatusChange,
  onPageSizeChange,
}: AccountListFiltersProps) {
  const { t } = useTranslation('staff');
  const words = useAccountWords();
  // Step 1: "Any status" first, then each state in the page's language.
  const statusOptions = [
    { value: anyStatusValue, label: t('users.list.anyStatus') },
    ...accountStatusFilters.map((offered) => ({ value: offered, label: words.status(offered) })),
  ];
  const pageSizeOptions = accountListPageSizes.map((size) => ({
    value: String(size),
    label: String(size),
  }));
  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Step 2: a status back to null for "Any status"; anything else must be one on offer. */}
      <Select
        id="users-list-status"
        label={t('users.list.statusLabel')}
        isLabelVisible
        options={statusOptions}
        value={status ?? anyStatusValue}
        onChange={(value) =>
          onStatusChange(accountStatusFilters.find((offered) => offered === value) ?? null)
        }
      />
      {/* Step 3: a page size only from the list on offer. */}
      <Select
        id="users-list-per-page"
        label={t('users.list.perPageLabel')}
        isLabelVisible
        options={pageSizeOptions}
        value={String(pageSize)}
        onChange={(value) =>
          onPageSizeChange(
            accountListPageSizes.find((size) => String(size) === value) ?? accountListPageSizes[0],
          )
        }
      />
    </div>
  );
}
