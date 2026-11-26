/**
 * AccountListEmail: one account's email in the full account list: masked ("r***@gmail.com") with
 * a "Show" button, then the whole address once shown (architecture 1.8.3: an email address is
 * shown only after "Show", and that click is logged; admin_reveal_email() logs it).
 *
 * Who shows it: AccountListTable, in the table and on the phone cards.
 */
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';

import type { ListedAccount } from '../../api/accountList';

/** What the cell needs. */
interface AccountListEmailProps {
  account: ListedAccount;
  /** The whole address once "Show" was pressed, otherwise undefined. */
  shownEmail: string | undefined;
  onShow: (userId: string) => void;
}

/**
 * Renders the email cell.
 *
 * @returns the whole address, the mask with "Show", or "None" for an account without an email
 */
export function AccountListEmail({ account, shownEmail, onShow }: AccountListEmailProps) {
  const { t } = useTranslation('staff');
  // Step 1: shown already: the address itself, long ones wrapping instead of widening the table.
  if (shownEmail !== undefined)
    return <span className="[overflow-wrap:anywhere]">{shownEmail}</span>;
  // Step 2: no email at all (an account made by staff tools or the seed).
  if (account.emailMasked === null) return <span>{t('users.list.noEmail')}</span>;
  // Step 3: the mask and the logged "Show", named for the account so a screen reader can tell
  // the buttons apart.
  const name = account.handle === null ? t('shell.noHandle') : `@${account.handle}`;
  return (
    <span className="flex flex-wrap items-center gap-x-2">
      <span className="[overflow-wrap:anywhere]">{account.emailMasked}</span>
      <Button
        variant="text"
        aria-label={t('users.list.showEmailFor', { name })}
        onClick={() => onShow(account.userId)}
      >
        {t('users.list.showEmail')}
      </Button>
    </span>
  );
}
