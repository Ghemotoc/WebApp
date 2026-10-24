/**
 * AccountOption: one account the search found, as a radio the staff member picks (story
 * S1-E11-01b).
 *
 * Shows the username, the pen name, the email masked ("r***@gmail.com") and the roles the account
 * already holds. "Show email" asks the database for the whole address, which it logs as a
 * sensitive read first (architecture 1.8.3). Staff screens use plain components, no doodles.
 * Who shows it: AccountResults.
 */
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';

import type { AccountMatch } from '../api/accountSearch';

/** What one option needs. */
interface AccountOptionProps {
  account: AccountMatch;
  isPicked: boolean;
  shownEmail: string | undefined;
  onPick: (account: AccountMatch) => void;
  onRevealEmail: (userId: string) => void;
}

/**
 * The line under the username: pen name, email and roles already held, whichever exist.
 *
 * @returns the parts, joined with " · "
 */
function detailsOf(props: AccountOptionProps, alreadyLabel: string | null): string {
  const parts = [
    props.account.penName,
    props.shownEmail ?? props.account.emailMasked,
    alreadyLabel,
  ];
  return parts.filter((part): part is string => part !== null && part !== undefined).join(' · ');
}

/**
 * Renders the option.
 *
 * @returns a list item with the radio, its label and, where an email exists, "Show email"
 */
export function AccountOption(props: AccountOptionProps) {
  const { t } = useTranslation('staff');
  const { account } = props;
  const name = account.handle === null ? t('roles.noHandle') : `@${account.handle}`;
  const roleNames = account.staffRoles.map((role) => t(`roleNames.${role}`)).join(', ');
  const alreadyLabel = roleNames === '' ? null : t('roles.alreadyStaff', { roles: roleNames });
  const inputId = `account-${account.userId}`;
  const canRevealEmail = account.emailMasked !== null && props.shownEmail === undefined;

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border py-3 first:border-t-0">
      <input
        id={inputId}
        type="radio"
        name="grant-account"
        className="size-5 accent-(--focus-ring)"
        checked={props.isPicked}
        onChange={() => props.onPick(account)}
      />
      <label htmlFor={inputId} className="flex min-w-0 flex-1 cursor-pointer flex-col">
        <span className="font-semibold text-ink">{name}</span>
        <span className="text-sm text-meta [overflow-wrap:anywhere]">
          {detailsOf(props, alreadyLabel)}
        </span>
      </label>
      {canRevealEmail && (
        <Button
          variant="text"
          aria-label={t('roles.showEmailFor', { name })}
          onClick={() => props.onRevealEmail(account.userId)}
        >
          {t('roles.showEmail')}
        </Button>
      )}
    </li>
  );
}
