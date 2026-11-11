/**
 * SignUpPage: sign-up, screen 2.1 (story S1-E2-01).
 *
 * Who shows it: the router, at /sign-up and at /join/<code> (an invite link, S1-E11-17); the top
 * bar's "Join for free" links here.
 * Layout (design/boards/Main.dc.html): two columns on wide screens (the hero, then the card), one
 * column on a phone, with the card after the hero.
 * What the card shows, in order of priority:
 * 1. while invite_only is on (the March test) and there is no working invitation: InviteGate;
 *    while the waiting list is on (WAITLIST-1), no code is needed: the heading says "Join the
 *    waiting list" and the form asks "write, read or both";
 * 2. once the link has been sent: CheckYourEmail;
 * 3. otherwise: the steps, the heading and SignUpForm.
 * What it reads: the public flags (useFeatureFlags), the invite (useInviteCheck), the current terms
 * and privacy notice (useLegalVersions, so the sign-up records the versions shown) and the
 * country of the connection with its market (useSignUpMarket, S1-E2-10), which starts the
 * country picker, and the age rules by country (useAgeRules, MARKETS-1). Once sign-up is public,
 * a closed or unknown country joins the waiting list with its country while the list is on
 * (MARKETS-2b, S1-E11-32), and goes to /not-open only while the list is off.
 */
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useParams } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { PageContainer } from '@/components/ui/PageContainer';
import { useFeatureFlags } from '@/features/flags/hooks/useFeatureFlags';
import { useLegalVersions } from '@/features/legal/hooks/useLegalVersions';
import { chooseLegalVersion } from '@/features/legal/lib/chooseLegalVersion';

import type { SignUpContext } from '../api/signUp';
import { useAgeRules } from '../hooks/useAgeRules';
import { useInviteCheck } from '../hooks/useInviteCheck';
import { useSignUpForm } from '../hooks/useSignUpForm';
import { useSignUpMarket, type SignUpMarket } from '../hooks/useSignUpMarket';

import type { InviteGateReason } from './InviteGate';
import { SignUpCardFlow } from './SignUpCardFlow';
import { SignUpHero } from './SignUpHero';
import { SignUpWhatNext } from './SignUpWhatNext';
import { SignUpSteps } from './SignUpSteps';

/**
 * Works out what sign-up sends besides the answers, once everything it needs has loaded.
 *
 * @param inviteCode - the code from the address, when invite_only is on
 * @param market - the country of the connection and its tokens
 * @returns the context, or null while the legal versions are loading or can't be read
 */
function useSignUpContext(
  inviteCode: string | null,
  market: SignUpMarket,
  isWaitlistOn: boolean,
): {
  context: SignUpContext | null;
  legalFailed: boolean;
} {
  const { i18n } = useTranslation();
  // The age rules by country (MARKETS-1); if they can't be read, the database still applies them.
  const ageRules = useAgeRules();
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
      signupToken: market.token,
      signupIpToken: market.ipToken,
      country: market.country,
      ageRules: ageRules.data ?? [],
      isWaitlistOn,
    },
    legalFailed: false,
  };
}

/**
 * Says why the invite gate shows, or null when the form can show.
 *
 * While the waiting list is on (WAITLIST-1) a code is optional: without one the form shows and
 * the person joins the list; a code in the address is still checked, so a broken one can be fixed.
 *
 * @param needsCode - whether a code is needed: invite_only on and the waiting list off
 * @param inviteCode - the code from the address
 * @param invite - the invite check's result
 * @returns the gate's reason, or null
 */
function inviteGateReason(
  needsCode: boolean,
  inviteCode: string | null,
  invite: ReturnType<typeof useInviteCheck>,
): InviteGateReason | 'checking' | null {
  if (inviteCode === null) return needsCode ? 'no_code' : null;
  if (invite.isPending) return 'checking';
  if (invite.isError) return 'unreachable';
  return invite.data === 'valid' ? null : invite.data;
}

/**
 * Works out whether this sign-up joins the waiting list and which code it uses.
 *
 * From a country that isn't open yet, a code doesn't skip the queue (MARKETS-2b, S1-E11-32): the
 * code is left unused and the person waits on the list with their country until it opens.
 *
 * @param isWaitlistOn - whether the waiting list is on
 * @param isMarketClosed - whether the connection's country is closed or unknown, once public
 * @param inviteCode - the code from the address, or null
 * @returns waitsForMarket, the code sign-up uses (or null) and whether it joins the list
 */
function waitlistChoice(isWaitlistOn: boolean, isMarketClosed: boolean, inviteCode: string | null) {
  const waitsForMarket = isWaitlistOn && isMarketClosed;
  const codeUsed = waitsForMarket ? null : inviteCode;
  return { waitsForMarket, codeUsed, joinsWaitlist: isWaitlistOn && codeUsed === null };
}

/**
 * Picks the line under the heading.
 *
 * @param joinsWaitlist - whether this sign-up joins the waiting list
 * @param waitsForMarket - whether the country isn't open yet (MARKETS-2b)
 * @returns the locale key
 */
function signUpSubheadingKey(joinsWaitlist: boolean, waitsForMarket: boolean): string {
  if (waitsForMarket) return 'signUp.waitlist.closedMarket';
  if (joinsWaitlist) return 'signUp.waitlist.subheading';
  return 'signUp.subheading';
}

/**
 * The card's eyebrow, heading and the line under it: sign-up, the waiting list, or the waiting list
 * for a country that isn't open yet (MARKETS-2b).
 *
 * @param props.joinsWaitlist - whether this sign-up joins the waiting list
 * @param props.waitsForMarket - whether the country isn't open yet
 * @returns the heading block
 */
function SignUpHeading(props: { joinsWaitlist: boolean; waitsForMarket: boolean }) {
  const { t } = useTranslation('auth');
  return (
    <div className="flex flex-col gap-2">
      <Eyebrow>{t('signUp.eyebrow')}</Eyebrow>
      <h2 id="sign-up-heading" className="m-0 font-heading text-[30px] font-bold text-heading">
        {t(props.joinsWaitlist ? 'signUp.waitlist.heading' : 'signUp.heading')}
      </h2>
      <p className="m-0 text-body">
        {t(signUpSubheadingKey(props.joinsWaitlist, props.waitsForMarket))}
      </p>
    </div>
  );
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
  // The waiting list (WAITLIST-1): while on, a code skips the queue and nobody needs one.
  const isWaitlistOn = flags.isOn('waitlist', false);
  const inviteCode = isInviteOnly || isWaitlistOn ? (code ?? null) : null;
  const invite = useInviteCheck(inviteCode);
  const isAdultsOnly = flags.isOn('adults_only', true);
  // The country of the connection (S1-E2-10): any country may join the invited test (Q6).
  const market = useSignUpMarket(isInviteOnly && isAdultsOnly);
  const { waitsForMarket, codeUsed, joinsWaitlist } = waitlistChoice(
    isWaitlistOn,
    market.isClosed,
    inviteCode,
  );
  const { context, legalFailed } = useSignUpContext(codeUsed, market, isWaitlistOn);
  const form = useSignUpForm(context, isAdultsOnly);
  const gateReason = inviteGateReason(isInviteOnly && !isWaitlistOn, codeUsed, invite);
  // With the waiting list off, a closed or unknown country sees the "not open yet" page instead.
  if (market.isClosed && !isWaitlistOn) return <Navigate to="/not-open" replace />;

  return (
    <PageContainer className="tmc-rise flex flex-col pt-12 pb-7">
      <title>{t('signUp.documentTitle')}</title>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,460px),1fr))] gap-14">
        <SignUpHero />
        <section
          aria-labelledby="sign-up-heading"
          className="flex w-full max-w-[480px] flex-col gap-5 justify-self-center rounded-card border border-border bg-surface p-8 shadow-card"
        >
          <SignUpSteps includesAgeCheck={!isAdultsOnly} />
          <SignUpHeading joinsWaitlist={joinsWaitlist} waitsForMarket={waitsForMarket} />
          <SignUpCardFlow
            gateReason={gateReason}
            inviteCode={codeUsed}
            form={form}
            context={context}
            legalFailed={legalFailed}
            includesAgeCheck={!isAdultsOnly}
          />
          {/* "Already have an account? Log in" (S1-E2-05). */}
          <p className="m-0 text-sm text-body">
            {t('signIn.haveAccount')}{' '}
            <Link to="/sign-in" className="text-link underline">
              {t('signIn.logInLink')}
            </Link>
          </p>
        </section>
      </div>
      {/* What can happen after "Create account" (board 2.1; LOOK-6). */}
      <SignUpWhatNext isAdultsOnly={isAdultsOnly} />
    </PageContainer>
  );
}
