/**
 * InviteGate: what the sign-up card shows while invite_only is on and there is no working
 * invitation yet (story S1-E2-01; the "ended" wording is S1-E11-17's; the field's errors and focus
 * are S1-E2-QA's, from Robert's staging check, 17 Oct 2026).
 *
 * Without a code: the test is by invitation, with a field for the code. With a code that has ended
 * or is unknown: the field keeps the code, is marked invalid and carries the reason as its error
 * (linked with aria-describedby). An empty code gets its own error. The code typed here goes into
 * the address (/join/<code>), the same link an admin hands out, so nothing is stored anywhere.
 * Look (bundle G6): "Continue" is the card's main button, full width, as "Create account" is.
 * Who uses it: SignUpCardFlow. The database refuses a sign-up without a working invite anyway.
 * What it calls: hooks/useInviteGateForm.ts.
 */
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextInput } from '@/components/ui/TextInput';

import { inviteCodeFieldId, useInviteGateForm } from '../hooks/useInviteGateForm';

/** Why the gate is showing. */
export type InviteGateReason = 'no_code' | 'ended' | 'unknown' | 'unreachable';

/** What the gate needs. */
interface InviteGateProps {
  reason: InviteGateReason;
  /** The code in the address, when there is one. */
  codeFromAddress: string | null;
}

/**
 * Picks the field's error: the empty code first, then a code that didn't work.
 *
 * @returns the locale key of the error, or null when the field has none
 */
function fieldErrorKey(reason: InviteGateReason, isEmptyCode: boolean): string | null {
  if (isEmptyCode) return 'invite.codeRequired';
  if (reason === 'ended' || reason === 'unknown') return `invite.${reason}`;
  return null;
}

/**
 * Renders the gate.
 *
 * @returns the explanation, the code field with its error, and Continue
 */
export function InviteGate({ reason, codeFromAddress }: InviteGateProps) {
  const { t } = useTranslation('auth');
  const form = useInviteGateForm(reason === 'no_code' ? null : codeFromAddress);
  const errorKey = fieldErrorKey(reason, form.isEmptyCode);

  return (
    <div className="flex flex-col gap-4">
      <h3 className="m-0 font-heading text-[22px] font-bold text-heading">{t('invite.heading')}</h3>
      <p className="m-0 text-body">{t('invite.body')}</p>
      {/* Not reaching the database isn't the code's fault, so it stays a notice. */}
      {reason === 'unreachable' && <Notice tone="error">{t('invite.unreachable')}</Notice>}
      <form onSubmit={form.submitCode} noValidate className="flex flex-col gap-3">
        <TextInput
          id={inviteCodeFieldId}
          label={t('invite.codeLabel')}
          hint={t('invite.codeHint')}
          errorMessage={errorKey === null ? undefined : t(errorKey)}
          autoComplete="off"
          value={form.code}
          onChange={(event) => form.changeCode(event.target.value)}
        />
        <Button type="submit" size="xl" className="w-full">
          {t('invite.continue')}
        </Button>
      </form>
    </div>
  );
}
