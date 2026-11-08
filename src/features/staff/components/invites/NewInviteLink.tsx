/**
 * NewInviteLink: the link just made, shown once with a Copy button (story S1-E11-17).
 *
 * Board (AdminUsers, Invites tab): "Invite link made: …", the read-only link field, Copy, and
 * "Copy it now. We won't show this link again": only the code's hash is stored, so the database
 * can't show it a second time. Who shows it: InvitesPage, while useInviteLinks holds the answer.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';

import type { NewInvite } from '../../api/inviteLinks';

/**
 * Renders the panel.
 *
 * @param props.invite - the link just made
 * @param props.onDismiss - hides the panel (the link is gone for good then)
 * @returns the panel
 */
export function NewInviteLink({ invite, onDismiss }: { invite: NewInvite; onDismiss: () => void }) {
  const { t, i18n } = useTranslation('staff');
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const expires = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'long' }).format(
    new Date(invite.expiresAt),
  );

  /** Copies the link; if the browser refuses, the field is still there to select by hand. */
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(invite.link);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  }

  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-card border border-(--success-border) bg-(--success-bg) p-5"
    >
      <p className="m-0 font-semibold text-(--success-text)">
        {t('invites.made.heading', { expires })}
      </p>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="invite-new-link" className="text-sm font-semibold text-ink">
          {t('invites.made.linkLabel')}
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="invite-new-link"
            type="text"
            readOnly
            value={invite.link}
            onFocus={(event) => event.target.select()}
            className="h-12 min-w-0 flex-1 field-box px-4 font-body text-[15px]"
          />
          <Button variant="secondary" onClick={() => void copyLink()}>
            {t(copyState === 'copied' ? 'invites.made.copied' : 'invites.made.copy')}
          </Button>
        </div>
        {copyState === 'failed' && (
          <p className="m-0 text-sm text-destructive">{t('invites.made.copyFailed')}</p>
        )}
      </div>
      <p className="m-0 text-sm text-ink">
        <strong>{t('invites.made.copyNow')}</strong> {t('invites.made.notAgain')}
      </p>
      <div>
        <Button variant="text" onClick={onDismiss}>
          {t('invites.made.dismiss')}
        </Button>
      </div>
    </div>
  );
}
