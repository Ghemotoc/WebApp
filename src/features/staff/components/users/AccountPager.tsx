/**
 * AccountPager: the "Newer · Page 2 of 5 · Older" buttons under a paged list on the account page
 * (bundle LOGS-1, parts a and b).
 *
 * Who shows it: AccountNotes and AccountStaffHistory. It holds no state: the list's hook keeps the
 * page number and this only asks for the one before or after. It hides itself when everything
 * fits on one page, so a short list has no dead buttons.
 */
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';

/** What the pager needs to know. */
interface AccountPagerProps {
  /** The name screen readers hear for the group, for example "Pages of staff notes". */
  label: string;
  pageNumber: number;
  /** How many pages there are, when the list knows; null when it only knows if there is a next. */
  pageCount: number | null;
  hasNextPage: boolean;
  onShowPage: (pageNumber: number) => void;
}

/**
 * Renders the buttons and the page number.
 *
 * @returns the pager, or nothing when there is one page
 */
export function AccountPager({
  label,
  pageNumber,
  pageCount,
  hasNextPage,
  onShowPage,
}: AccountPagerProps) {
  const { t } = useTranslation('staff');
  // Step 1: one page and nothing after it: no pager at all.
  if (pageNumber === 1 && !hasNextPage) return null;
  // Step 2: "Page 2 of 5" when the count is known, "Page 2" when it isn't.
  const pageText =
    pageCount === null
      ? t('auditLog.page', { number: pageNumber })
      : t('users.pager.pageOf', { number: pageNumber, count: pageCount });
  return (
    <nav aria-label={label} className="flex flex-wrap items-center gap-3">
      <Button
        variant="secondary"
        disabled={pageNumber === 1}
        onClick={() => onShowPage(pageNumber - 1)}
      >
        {t('auditLog.newer')}
      </Button>
      <span className="text-sm text-meta" aria-live="polite">
        {pageText}
      </span>
      <Button
        variant="secondary"
        disabled={!hasNextPage}
        onClick={() => onShowPage(pageNumber + 1)}
      >
        {t('auditLog.older')}
      </Button>
    </nav>
  );
}
