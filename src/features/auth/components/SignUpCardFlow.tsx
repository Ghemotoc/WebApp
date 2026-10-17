/**
 * SignUpCardFlow: the part of the sign-up card that changes: the invite gate, or the form and the
 * steps after it (stories S1-E2-01, S1-E2-02, S1-E2-10).
 *
 * In order of priority:
 * 1. while the invite is being checked: "Checking your invitation…";
 * 2. while invite_only is on and there is no working invitation: InviteGate;
 * 3. otherwise the "Invitation accepted" note, a legal-texts error if they couldn't load, and
 *    SignUpCardBody (the form, the age refusal or "Check your email").
 * Who shows it: SignUpPage, inside the card.
 */
import { useTranslation } from 'react-i18next';

import { Notice } from '@/components/ui/Notice';

import type { SignUpContext } from '../api/signUp';
import type { useSignUpForm } from '../hooks/useSignUpForm';

import { InviteGate, type InviteGateReason } from './InviteGate';
import { SignUpCardBody } from './SignUpCardBody';

/** What the flow needs from the page. */
interface SignUpCardFlowProps {
  gateReason: InviteGateReason | 'checking' | null;
  hasInviteCode: boolean;
  form: ReturnType<typeof useSignUpForm>;
  context: SignUpContext | null;
  legalFailed: boolean;
  includesAgeCheck: boolean;
}

/**
 * Renders the gate or the form.
 *
 * @returns the card's changing part
 */
export function SignUpCardFlow(props: SignUpCardFlowProps) {
  const { t } = useTranslation('auth');
  const { gateReason, form } = props;
  if (gateReason === 'checking') return <p className="m-0 text-body">{t('invite.checking')}</p>;
  if (gateReason !== null) return <InviteGate reason={gateReason} />;
  return (
    <>
      {props.hasInviteCode && form.sentTo === null && (
        <Notice tone="success">{t('invite.accepted')}</Notice>
      )}
      {props.legalFailed && <Notice tone="error">{t('signUp.errors.legalNotLoaded')}</Notice>}
      <SignUpCardBody
        form={form}
        context={props.context}
        includesAgeCheck={props.includesAgeCheck}
      />
    </>
  );
}
