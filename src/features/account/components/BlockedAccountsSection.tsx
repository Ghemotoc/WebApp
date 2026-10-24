/**
 * BlockedAccountsSection: "Blocked accounts" in Settings, each with Unblock (story S1-E5-05).
 *
 * So a person can always undo a block, even when they no longer remember the username. Each row
 * links to the profile (which shows the "You block" card) and has an Unblock button whose
 * accessible name names the person. No doodles (DoD: safety screens).
 * Who shows it: SettingsPage. What it calls: useMyBlockedAccounts → my_blocked_accounts(),
 * useBlock → set_block().
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { useBlock } from '@/features/people/hooks/useBlock';
import { useMyBlockedAccounts } from '@/features/people/hooks/useMyBlockedAccounts';

/** The list, its empty state or its error. */
function BlockedList() {
  const { t } = useTranslation('people');
  const { accounts, isLoaded, loadFailed } = useMyBlockedAccounts();
  const block = useBlock();
  if (loadFailed) return <Notice tone="error">{t('settings.blockedLoadFailed')}</Notice>;
  if (!isLoaded) return null;
  if (accounts.length === 0) return <p className="m-0 text-body">{t('settings.blockedEmpty')}</p>;
  return (
    <>
      {block.hasFailed && <Notice tone="error">{t('safety.unblockFailed')}</Notice>}
      <ul className="m-0 flex list-none flex-col p-0">
        {accounts.map((account) => (
          <li
            key={account.handle}
            className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-2 last:border-b-0"
          >
            <Link
              to={`/u/${encodeURIComponent(account.handle)}`}
              className="text-link underline hover:text-link-hover"
            >
              {account.displayName} <span className="text-meta">@{account.handle}</span>
            </Link>
            <Button
              variant="secondary"
              aria-label={t('settings.unblockLabel', { handle: account.handle })}
              disabled={block.isSaving}
              onClick={() => void block.change(account.handle, false).catch(() => undefined)}
            >
              {t('settings.unblock')}
            </Button>
          </li>
        ))}
      </ul>
    </>
  );
}

/**
 * Renders the section.
 *
 * @returns the section
 */
export function BlockedAccountsSection() {
  const { t } = useTranslation('people');
  return (
    <section
      aria-labelledby="settings-blocked-heading"
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-card"
    >
      <h2
        id="settings-blocked-heading"
        className="m-0 font-heading text-[22px] font-bold text-heading"
      >
        {t('settings.blockedHeading')}
      </h2>
      <BlockedList />
    </section>
  );
}
