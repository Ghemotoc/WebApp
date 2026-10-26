/**
 * ReferralLog: the referrals to authorities logged on a safeguarding case, and the form to log a
 * new one (story S1-E10-10; criterion 2; DSA art. 18: tell the police where life or safety is
 * at risk).
 *
 * Logging records that we referred the case; the call or email to the authority happens outside
 * the app, by the runbook (docs/runbooks/safeguarding.md).
 * Who shows it: SafeguardingPanel. What it calls: the refer() it is given (useSafeguarding).
 */
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextInput } from '@/components/ui/TextInput';

import type { useSafeguarding } from '../hooks/useSafeguarding';

/**
 * The form to log a referral.
 *
 * @returns the form
 */
function ReferralForm({ safeguarding }: { safeguarding: ReturnType<typeof useSafeguarding> }) {
  const { t } = useTranslation('moderation');
  const [authorityName, setAuthorityName] = useState('');
  const [authorityReference, setAuthorityReference] = useState('');
  const [note, setNote] = useState('');
  const [isMissing, setIsMissing] = useState(false);

  /** Needs the authority's name, then logs it and clears the form. */
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsMissing(authorityName.trim() === '');
    if (authorityName.trim() === '') return;
    try {
      await safeguarding.refer({
        authorityName: authorityName.trim(),
        authorityReference: authorityReference.trim(),
        note: note.trim(),
      });
      setAuthorityName('');
      setAuthorityReference('');
      setNote('');
    } catch {
      // Shown from the hook's state (referFailure) below.
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-3">
      <TextInput
        id="referral-authority"
        label={t('safeguarding.authority')}
        errorMessage={isMissing ? t('safeguarding.authorityMissing') : undefined}
        value={authorityName}
        onChange={(event) => setAuthorityName(event.target.value)}
      />
      <TextInput
        id="referral-reference"
        label={t('safeguarding.authorityReference')}
        value={authorityReference}
        onChange={(event) => setAuthorityReference(event.target.value)}
      />
      <TextInput
        id="referral-note"
        label={t('safeguarding.referralNote')}
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      {safeguarding.referFailure !== null && (
        <Notice tone="error">{t(`failures.${safeguarding.referFailure}`)}</Notice>
      )}
      <div>
        <Button type="submit" variant="secondary" disabled={safeguarding.isReferring}>
          {t('safeguarding.logReferral')}
        </Button>
      </div>
    </form>
  );
}

/**
 * Renders the referrals and the form.
 *
 * @returns the block
 */
export function ReferralLog({
  safeguarding,
}: {
  safeguarding: ReturnType<typeof useSafeguarding>;
}) {
  const { t, i18n } = useTranslation('moderation');
  const format = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Bucharest',
  });
  return (
    <div className="flex flex-col gap-3">
      <h3 className="m-0 text-base font-semibold text-heading">
        {t('safeguarding.referralsHeading')}
      </h3>
      {safeguarding.referrals.length === 0 && (
        <p className="m-0 text-body">{t('safeguarding.noReferrals')}</p>
      )}
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {safeguarding.referrals.map((referral) => (
          <li key={referral.referredAt} className="text-body">
            {t('safeguarding.referralLine', {
              authority: referral.authorityName,
              reference: referral.authorityReference ?? t('safeguarding.noReference'),
              when: format.format(new Date(referral.referredAt)),
              handle: referral.referredBy,
            })}
            {referral.note !== null && referral.note !== '' && (
              <span className="block text-sm text-meta">{referral.note}</span>
            )}
          </li>
        ))}
      </ul>
      <ReferralForm safeguarding={safeguarding} />
    </div>
  );
}
