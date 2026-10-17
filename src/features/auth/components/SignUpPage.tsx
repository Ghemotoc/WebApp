/**
 * SignUpPage: sign-up, screen 2.1 (story S1-E2-01).
 *
 * Who shows it: the router, at /sign-up and at /join/<code> (an invite link, S1-E11-17); the top
 * bar's "Join for free" links here.
 * Layout (design/boards/Main.dc.html): two columns on wide screens (the hero, then the card), one
 * column on a phone, with the card after the hero.
 * What the card shows, in order of priority:
 * 1. while invite_only is on (the March test) and there is no working invitation: InviteGate;
 * 2. once the link has been sent: CheckYourEmail;
 * 3. otherwise: the steps, the heading and SignUpForm.
 * What it reads: the public flags (useFeatureFlags), the invite (useInviteCheck), the current terms
 * and privacy notice (useLegalVersions, so the sign-up records the versions shown).
 */
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { useFeatureFlags } from '@/features/flags/hooks/useFeatureFlags';
import { useLegalVersions } from '@/features/legal/hooks/useLegalVersions';
import { chooseLegalVersion } from '@/features/legal/lib/chooseLegalVersion';

import type { SignUpContext } from '../api/signUp';
import { useInviteCheck } from '../hooks/useInviteCheck';
import { useSignUpForm } from '../hooks/useSignUpForm';

import { InviteGate, type InviteGateReason } from './InviteGate';
import { SignUpCardBody } from './SignUpCardBody';
import { SignUpHero } from './SignUpHero';
import { SignUpSteps } from './SignUpSteps';

/**
 * Works out what sign-up sends besides the answers, once everything it needs has loaded.
 *
 * @param inviteCode - the code from the address, when invite_only is on
 * @returns the context, or null while the legal versions are loading or can't be read
 */
function useSignUpContext(inviteCode: string | null): {
  context: SignUpContext | null;
  legalFailed: boolean;
} {
  const { i18n } = useTranslation();
  const terms = useLegalVersions('terms');
  const privacy = useLegalVersions('privacy');
  const termsVersion = chooseLegalVersion(terms.data ?? [], i18n.language).current;
  const privacyVersion = chooseLegalVersion(privacy.data ?? [], i18n.language).current;
  if (termsVersion === null || privacyVersion === null) {
    return { context: null, legalFailed: terms.isError || privacy.isError };
  }
  return {
    context: {
      inviteCode,
      termsVersionId: termsVersion.id,
      privacyVersionId: privacyVersion.id,
      locale: i18n.language,
    },
    legalFailed: false,
  };
}

/**
 * Says why the invite gate shows, or null when the form can show.
 *
 * @param isInviteOnly - the invite_only flag
 * @param inviteCode - the code from the address
 * @param invite - the invite check's result
 * @returns the gate's reason, or null
 */
function inviteGateReason(
  isInviteOnly: boolean,
  inviteCode: string | null,
  invite: ReturnType<typeof useInviteCheck>,
): InviteGateReason | 'checking' | null {
  if (!isInviteOnly) return null;
  if (inviteCode === null) return 'no_code';
  if (invite.isPending) return 'checking';
  if (invite.isError) return 'unreachable';
  return invite.data === 'valid' ? null : invite.data;
}

/**
 * Renders the page.
 *
 * @returns the sign-up screen
 */
export function SignUpPage() {
  const { t } = useTranslation('auth');
  const { code } = useParams();
  const flags = useFeatureFlags();
  const isInviteOnly = flags.isOn('invite_only', true);
  const inviteCode = isInviteOnly ? (code ?? null) : null;
  const invite = useInviteCheck(inviteCode);
  const { context, legalFailed } = useSignUpContext(inviteCode);
  const form = useSignUpForm(context);
  const gateReason = inviteGateReason(isInviteOnly, inviteCode, invite);

  return (
    <PageContainer className="tmc-rise grid grid-cols-[repeat(auto-fit,minmax(min(100%,460px),1fr))] gap-14 pt-12 pb-7">
      <title>{t('signUp.documentTitle')}</title>
      <SignUpHero />
      <section
        aria-labelledby="sign-up-heading"
        className="flex w-full max-w-[480px] flex-col gap-5 justify-self-center rounded-card border border-border bg-surface p-8 shadow-card"
      >
        <SignUpSteps includesAgeCheck={!flags.isOn('adults_only', true)} />
        <div className="flex flex-col gap-2">
          <Eyebrow>{t('signUp.eyebrow')}</Eyebrow>
          <h2 id="sign-up-heading" className="m-0 font-heading text-[30px] font-bold text-heading">
            {t('signUp.heading')}
          </h2>
          <p className="m-0 text-body">{t('signUp.subheading')}</p>
        </div>
        {gateReason === 'checking' && <p className="m-0 text-body">{t('invite.checking')}</p>}
        {gateReason !== null && gateReason !== 'checking' && <InviteGate reason={gateReason} />}
        {gateReason === null && (
          <>
            {inviteCode !== null && form.sentTo === null && (
              <Notice tone="success">{t('invite.accepted')}</Notice>
            )}
            {legalFailed && <Notice tone="error">{t('signUp.errors.legalNotLoaded')}</Notice>}
            <SignUpCardBody form={form} context={context} />
          </>
        )}
      </section>
    </PageContainer>
  );
}
