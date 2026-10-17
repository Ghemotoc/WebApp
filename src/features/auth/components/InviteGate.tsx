/**
 * InviteGate: what the sign-up card shows while invite_only is on and there is no working
 * invitation yet (story S1-E2-01; the "ended" wording is S1-E11-17's).
 *
 * Without a code: the test is by invitation, with a field for the code. With a code that has ended
 * or is unknown: the reason, and the field again. The code typed here goes into the address
 * (/join/<code>), the same link an admin hands out, so nothing is stored anywhere.
 * Who uses it: SignUpPage. The database refuses a sign-up without a working invite anyway.
 */
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextInput } from '@/components/ui/TextInput';

/** Why the gate is showing. */
export type InviteGateReason = 'no_code' | 'ended' | 'unknown' | 'unreachable';

/** What the gate needs. */
interface InviteGateProps {
  reason: InviteGateReason;
}

/**
 * Renders the gate.
 *
 * @returns the explanation, the reason when there is one, and the code field
 */
export function InviteGate({ reason }: InviteGateProps) {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const [code, setCode] = useState('');

  /** Opens the same address an invite link would. */
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedCode = code.trim();
    if (trimmedCode !== '') void navigate(`/join/${encodeURIComponent(trimmedCode)}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="m-0 font-heading text-[22px] font-bold text-heading">{t('invite.heading')}</h3>
      <p className="m-0 text-body">{t('invite.body')}</p>
      {reason !== 'no_code' && (
        <Notice tone={reason === 'unreachable' ? 'error' : 'warning'}>
          {t(`invite.${reason}`)}
        </Notice>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <TextInput
          id="invite-code"
          label={t('invite.codeLabel')}
          hint={t('invite.codeHint')}
          autoComplete="off"
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
        <Button type="submit" variant="secondary" size="lg" className="self-start">
          {t('invite.continue')}
        </Button>
      </form>
    </div>
  );
}
