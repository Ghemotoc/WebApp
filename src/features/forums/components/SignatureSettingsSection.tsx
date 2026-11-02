/**
 * SignatureSettingsSection: "Forum signature" in Settings (story S1-E8-08; board 6.3, with the
 * limits from board 6.1: "Up to 300 characters, three lines and one still picture").
 *
 * The section has the id "forum-signature", so a moderator's request in Notifications links
 * straight here. When a moderator asked for a change (Q29), a notice at the top says why and by
 * when; changing the signature in time closes the request, and otherwise it is removed after 24
 * hours with a statement of reasons.
 * Who shows it: SettingsPage, once the person has a username. What it calls: useMySignature,
 * ChangeRequestNotice, SignatureWordsForm and SignaturePictureControls.
 */
import { Notice } from '@/components/ui/Notice';

import { useMySignature, useSignatureChange } from '../hooks/useForumSignatures';
import { useForumsTranslation } from '../registerForumsTranslations';

import { ChangeRequestNotice } from './ChangeRequestNotice';
import { SignaturePictureControls } from './SignaturePictureControls';
import { SignatureWordsForm } from './SignatureWordsForm';

/**
 * Renders the section.
 *
 * @returns the section, once the signature has loaded
 */
export function SignatureSettingsSection() {
  const { t } = useForumsTranslation();
  const mine = useMySignature();
  const { save } = useSignatureChange();
  const savedText = mine.data?.signature?.text ?? '';
  return (
    <section
      id="forum-signature"
      aria-labelledby="settings-signature-heading"
      className="flex scroll-mt-24 flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-card"
    >
      <h2
        id="settings-signature-heading"
        className="m-0 font-heading text-[22px] font-bold text-heading"
      >
        {t('signature.eyebrow')}
      </h2>
      <p className="m-0 text-[15px] text-body">{t('signature.intro')}</p>
      {mine.isError && <Notice tone="error">{t('signature.loadFailed')}</Notice>}
      {mine.data?.changeRequest != null && (
        <ChangeRequestNotice
          request={mine.data.changeRequest}
          messageKey="signature.changeRequested"
        />
      )}
      {mine.data !== undefined && (
        <>
          <SignatureWordsForm
            key={savedText}
            savedText={savedText}
            pictureId={mine.data.pictureId}
            save={save}
          />
          <SignaturePictureControls mine={mine.data} />
        </>
      )}
    </section>
  );
}
