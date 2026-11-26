/**
 * ProfileShareButton: "Share" in the profile's action row, beside Follow and Message (bundle 3 of
 * "Build: the full design as user stories", board C04; Robert, 25 Nov 2026, 09:50 UTC).
 *
 * It opens "Share this profile": the profile's link in a read-only field with "Copy link" and, on a
 * device with its own share menu, "Share with an app". The link is the profile's own address,
 * /u/<username>, never the user ID (architecture 1.6), with no sharer ID or tracking code (rule
 * 7); whoever opens it sees only what the profile shows their account.
 * Who uses it: ProfileHeader. What it calls: the sharing feature's SharingModal, ShareLinkRow
 * and systemShare (the same pieces "Share this space" uses), and lib/profileShareLink.ts.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { ButtonRow } from '@/components/ui/ButtonRow';
import { ShareLinkRow } from '@/features/sharing/components/ShareLinkRow';
import { SharingModal } from '@/features/sharing/components/SharingModal';
import { shareWithSystem } from '@/features/sharing/lib/systemShare';
import { registerSharingTranslations } from '@/features/sharing/registerSharingTranslations';

import { profileShareLink } from '../lib/profileShareLink';
import { usePeopleTranslation } from '../registerPeopleTranslations';

/**
 * "Share with an app", only where the browser has a share menu.
 *
 * @param props.name - the name the menu shows
 * @param props.link - the link to share
 * @returns the button, or nothing on a browser without navigator.share
 */
function SystemShareButton({ name, link }: { name: string; link: string }) {
  const { t } = usePeopleTranslation();
  if (typeof navigator.share !== 'function') return null;

  /** Opens the device's share menu; a failure leaves the link to copy instead. */
  async function share() {
    try {
      await shareWithSystem(name, link);
    } catch (error) {
      console.warn('The system share sheet failed.', error);
    }
  }

  return (
    <Button variant="secondary" onClick={() => void share()}>
      {t('share.withApp')}
    </Button>
  );
}

/**
 * Renders the button and, once pressed, the dialog.
 *
 * @param props.handle - the profile's username
 * @param props.name - the name on the profile, for the button's accessible name and the dialog
 * @returns the button and the dialog
 */
export function ProfileShareButton({ handle, name }: { handle: string; name: string }) {
  const { t } = usePeopleTranslation();
  const { i18n } = useTranslation();
  // The link row's words live in the sharing feature's namespace.
  registerSharingTranslations(i18n);
  const [isOpen, setIsOpen] = useState(false);
  const link = profileShareLink(handle);
  return (
    <>
      <Button
        variant="secondary"
        aria-haspopup="dialog"
        aria-label={t('share.buttonLabel', { name })}
        onClick={() => setIsOpen(true)}
      >
        {t('share.button')}
      </Button>
      <SharingModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={t('share.title')}
        description={name}
        closeLabel={t('share.close')}
      >
        <ShareLinkRow link={link} wasCopied={null} />
        <p className="m-0 type-body text-ink-muted">{t('share.privacy')}</p>
        <ButtonRow className="border-t border-border pt-4">
          <Button onClick={() => setIsOpen(false)}>{t('share.done')}</Button>
          <SystemShareButton name={name} link={link} />
        </ButtonRow>
      </SharingModal>
    </>
  );
}
