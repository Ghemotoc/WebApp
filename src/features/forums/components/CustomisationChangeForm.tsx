/**
 * CustomisationChangeForm: "Ask for a change", the moderators' request to change a forum
 * signature or a space's banner picture within 24 hours (story S1-E8-08 criterion 3; Q29).
 *
 * A moderator writes why; the owner is told at once in Notifications (a required notice they
 * can't switch off) and in Settings or the space's settings. If nothing changes in 24 hours, a job
 * removes it and sends a statement of reasons (DSA art. 17). Staff never write a new signature:
 * they only ask, or it is removed (architecture 1.8.5). Shown only to staff who may act in
 * moderation; the database checks the same (staff_may('moderation', 'act')) and logs the request.
 * Plain components, no doodles (DoD: staff screens).
 * Who uses it: the staff account page (a signature) and SpaceBannerPictureCard (a banner).
 * What it calls: useRequestCustomisationChange → admin_request_customisation_change().
 */
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Textarea } from '@/components/ui/Textarea';
import { useMyStaffAccess } from '@/features/staff/hooks/useMyStaffAccess';

import type { ChangeRequestAsk } from '../api/forumSignatures';
import { signatureFailureOf, useRequestCustomisationChange } from '../hooks/useForumSignatures';
import { useForumsTranslation } from '../registerForumsTranslations';

/** What the form needs: what to ask about, and whose (a username or a space's address). */
export interface CustomisationChangeFormProps {
  item: ChangeRequestAsk['item'];
  reference: string;
}

/** The longest reason the database keeps. */
const reasonMaxLength = 500;

/**
 * Renders the form.
 *
 * @returns the form, or nothing for anyone who may not act in moderation
 */
export function CustomisationChangeForm({ item, reference }: CustomisationChangeFormProps) {
  const { t } = useForumsTranslation();
  const { access } = useMyStaffAccess();
  const asking = useRequestCustomisationChange();
  const [reason, setReason] = useState('');
  const [isMissing, setIsMissing] = useState(false);
  const mayAct = access.areas.some((area) => area.area === 'moderation' && area.access === 'act');
  if (!mayAct) return null;
  const failure = signatureFailureOf(asking.error);
  const fieldId = `change-request-${item}`;

  /** Sends the request, once there is a reason. */
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const cleaned = reason.trim();
    setIsMissing(cleaned === '');
    if (cleaned !== '') asking.mutate({ item, reference, reason: cleaned });
  }

  return (
    <section aria-labelledby={`${fieldId}-heading`} className="flex flex-col gap-3">
      <h2 id={`${fieldId}-heading`} className="m-0 font-heading text-xl font-bold text-heading">
        {t('signature.staff.title')}
      </h2>
      <p className="m-0 text-[15px] text-body">
        {t(item === 'signature' ? 'signature.staff.signatureIntro' : 'signature.staff.bannerIntro')}
      </p>
      <form noValidate className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <Textarea
          id={fieldId}
          label={t('signature.staff.reasonLabel')}
          hint={t('signature.staff.reasonHint')}
          rows={3}
          maxLength={reasonMaxLength}
          value={reason}
          aria-invalid={isMissing ? true : undefined}
          onChange={(event) => {
            asking.reset();
            setReason(event.target.value);
          }}
        />
        <div aria-live="polite" className="flex flex-col gap-2">
          {isMissing && <Notice tone="error">{t('signature.staff.reasonMissing')}</Notice>}
          {failure !== null && (
            <Notice tone="error">{t(`signature.failed.${failure.failure}`)}</Notice>
          )}
          {asking.isSuccess && <Notice tone="success">{t('signature.staff.sent')}</Notice>}
        </div>
        <div>
          <Button type="submit" variant="secondary" disabled={asking.isPending}>
            {asking.isPending ? t('signature.staff.sending') : t('signature.staff.send')}
          </Button>
        </div>
      </form>
    </section>
  );
}
