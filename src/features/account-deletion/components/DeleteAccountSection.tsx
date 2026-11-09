/**
 * DeleteAccountSection: "Delete account" in Settings (story S1-E13-03; board Settings 6.3, the
 * Delete account tab, drawn here as a panel on the one Settings page like the others; GDPR
 * art. 17; Apple guideline 5.1.1(v)).
 *
 * Top to bottom as on the board: the heading, that the account closes at once and is deleted for
 * good 14 days later, that stories go with it, "download the data first", "Delete account",
 * and the line that the website has a deletion page too (/delete-account). "Delete account"
 * opens the confirmation (DeleteAccountConfirm). The section has id "delete-account", so
 * /delete-account and a provider's return after "Log in again" open it.
 * Who shows it: SettingsPage. What it calls: useMyAccountDeletion.
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { brand } from '@/config/brand';

import { useMyAccountDeletion } from '../hooks/useAccountDeletion';
import { useAccountDeletionTranslation } from '../registerAccountDeletionTranslations';

import { DeleteAccountConfirm } from './DeleteAccountConfirm';

/** "You might want to download your data first", with the link to that panel. */
function DownloadFirstLine() {
  const { t } = useAccountDeletionTranslation();
  return (
    <p className="m-0 text-body">
      {t('settings.downloadFirstBefore')}{' '}
      <a href="#download-my-data" className="text-link underline">
        {t('settings.downloadFirstLink')}
      </a>
      {t('settings.downloadFirstAfter')}
    </p>
  );
}

/** The panel's body: the first panel, then the confirmation once "Delete account" is pressed. */
function SectionBody() {
  const { t } = useAccountDeletionTranslation();
  const deletion = useMyAccountDeletion();
  // Opened straight away when the person comes back from logging in again with a provider.
  const [isConfirming, setIsConfirming] = useState(
    () => window.location.hash === '#delete-account',
  );
  if (deletion.isError) return <Notice tone="error">{t('settings.loadFailed')}</Notice>;
  // A closing account sees the closing page instead of Settings (AccountClosingGate).
  if (deletion.data === undefined || deletion.data.state !== 'open') return null;
  const { deletionDays, signedInRecently } = deletion.data;
  return (
    <>
      <p className="m-0 text-body">{t('settings.intro', { count: deletionDays })}</p>
      <p className="m-0 text-body">{t('settings.storiesLine')}</p>
      <DownloadFirstLine />
      {isConfirming ? (
        <DeleteAccountConfirm
          deletionDays={deletionDays}
          signedInRecently={signedInRecently}
          onKeep={() => setIsConfirming(false)}
        />
      ) : (
        <Button variant="destructive" className="w-fit" onClick={() => setIsConfirming(true)}>
          {t('settings.start')}
        </Button>
      )}
      <p className="m-0 text-sm text-meta">
        {t('settings.webRoute', { address: `${brand.siteDomain}/delete-account` })}
      </p>
    </>
  );
}

/**
 * Renders the section.
 *
 * @returns the section
 */
export function DeleteAccountSection() {
  const { t } = useAccountDeletionTranslation();
  return (
    <section
      id="delete-account"
      aria-labelledby="settings-delete-account-heading"
      className="flex scroll-mt-24 flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-card"
    >
      <h2
        id="settings-delete-account-heading"
        className="m-0 font-heading text-[22px] font-bold text-heading"
      >
        {t('settings.heading')}
      </h2>
      <SectionBody />
    </section>
  );
}
