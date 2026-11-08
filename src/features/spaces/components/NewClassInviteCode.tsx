/**
 * NewClassInviteCode: the class's new code and link, shown this once (bundle CLASSES, part a;
 * story S1-E8-11 criterion 4).
 *
 * Only the code's hash is kept, so the page says to copy or print it now: the code in large
 * letters, the link in a read-only field with Copy, and Print (the browser's own print, so a
 * teacher can hand the code out on paper). Like the staff invite panel (S1-E11-17).
 * IDEAS-3b (idea IDEA-20261102-3): a QR code of the link sits beside the code, so students can
 * scan it from the board, and Print prints only ClassInviteSheet, one clean page.
 * Who shows it: ClassInviteCard, while useClassInviteChanges holds the answer.
 * What it calls: ClassInviteQrCode and ClassInviteSheet.
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';

import type { NewClassInvite } from '../api/classSpaces';
import { useSpacesTranslation } from '../registerSpacesTranslations';
import { ClassInviteQrCode } from './ClassInviteQrCode';
import { ClassInviteSheet } from './ClassInviteSheet';

/**
 * The link in a read-only field with Copy; if the browser refuses to copy, it says so and the
 * field is still there to select by hand.
 *
 * @param props.link - the joining link
 * @returns the label, the field, the button and any "couldn't copy" line
 */
function InviteLinkField({ link }: { link: string }) {
  const { t } = useSpacesTranslation();
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  /** Copies the link; if the browser refuses, the field is still there to select by hand. */
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="class-invite-link" className="text-sm font-semibold text-ink">
        {t('classInvite.linkLabel')}
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id="class-invite-link"
          type="text"
          readOnly
          value={link}
          onFocus={(event) => event.target.select()}
          className="h-12 min-w-0 flex-1 field-box px-4 font-body text-[15px]"
        />
        <Button variant="secondary" onClick={() => void copyLink()}>
          {t(copyState === 'copied' ? 'classInvite.copied' : 'classInvite.copy')}
        </Button>
      </div>
      {copyState === 'failed' && (
        <p className="m-0 text-sm text-destructive">{t('classInvite.copyFailed')}</p>
      )}
    </div>
  );
}

/**
 * Renders the panel.
 *
 * @param props.invite - the code just made
 * @param props.className - the class's name, printed with the code
 * @param props.onDismiss - hides the panel (the code is gone from the screen for good then)
 * @returns the panel
 */
export function NewClassInviteCode({
  invite,
  className,
  onDismiss,
}: {
  invite: NewClassInvite;
  className: string;
  onDismiss: () => void;
}) {
  const { t, i18n } = useSpacesTranslation();
  const expires = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'long' }).format(
    new Date(invite.expiresAt),
  );

  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-card border border-(--success-border) bg-(--success-bg) p-5"
    >
      <p className="m-0 font-semibold text-(--success-text)">
        {t('classInvite.made', { name: className, expires, count: invite.admits })}
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <p className="m-0 font-heading text-[28px] font-bold tracking-[0.06em] break-all text-heading">
          {invite.code}
        </p>
        <ClassInviteQrCode link={invite.link} className="block size-40 shrink-0" />
      </div>
      <InviteLinkField link={invite.link} />
      <p className="m-0 text-sm text-ink">
        <strong>{t('classInvite.copyNow')}</strong> {t('classInvite.notAgain')}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={() => window.print()}>
          {t('classInvite.print')}
        </Button>
        <Button variant="text" onClick={onDismiss}>
          {t('classInvite.dismiss')}
        </Button>
      </div>
      <ClassInviteSheet invite={invite} className={className} expires={expires} />
    </div>
  );
}
