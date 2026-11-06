/**
 * ParentAnswerPage: the page a parent or guardian opens from the email, screen 2.4, right side
 * (story S1-E2-03, criteria 2, 3 and 5; board ParentConsent.dc.html).
 *
 * Who shows it: the router, at /parent-consent/answer. The link is /parent-consent/answer#<token>:
 * the token sits after "#", so it never reaches a server log or a Referer header (ADR 0011).
 * What it shows, from useConsentRequest(token):
 * - a waiting request: who asked, ParentAnswerDetails, then ParentAnswerForm;
 * - an answered one: ParentAnswerOutcome (with "Withdraw my consent" after a yes);
 * - a link that no longer works: "This link no longer works".
 * Works signed out. Once the request loads, the page switches to the email's language (without
 * saving it anywhere), so the parent reads what the child chose for them; the language menu
 * still changes it. Plain page: no doodles.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import type { ConsentRequestDetails } from '../api/parentConsent';
import { useConsentRequest } from '../hooks/useConsentRequest';

import { ContactLine } from './ContactLine';
import { ParentAnswerDetails } from './ParentAnswerDetails';
import { ParentAnswerForm } from './ParentAnswerForm';
import { ParentAnswerOutcome } from './ParentAnswerOutcome';
import { errorShownByHook } from '@/lib/errorShownByHook';

/** useConsentRequest's result, passed down once. */
type ConsentState = ReturnType<typeof useConsentRequest>;

/**
 * Switches the page to the email's language once, when the request first loads.
 *
 * @param request - the loaded request, or null and undefined before that
 */
function useRequestLanguage(request: ConsentRequestDetails | null | undefined) {
  const { i18n } = useTranslation();
  const hasSwitched = useRef(false);
  useEffect(() => {
    if (hasSwitched.current || request === null || request === undefined) return;
    hasSwitched.current = true;
    if (i18n.language !== request.language) void i18n.changeLanguage(request.language);
  }, [request, i18n]);
}

/**
 * The page's card, with the heading the state needs.
 *
 * @returns the card
 */
function AnswerCard({ heading, children }: { heading: string; children: ReactNode }) {
  const { t } = useTranslation('account');
  return (
    <section
      aria-labelledby="parent-answer-heading"
      className="flex w-full max-w-[720px] flex-col gap-5 rounded-card border border-border bg-surface p-[clamp(20px,5vw,32px)] shadow-card"
    >
      <div className="flex flex-col gap-2">
        <Eyebrow>{t('parentConsent.parent.eyebrow')}</Eyebrow>
        <h1
          id="parent-answer-heading"
          className="m-0 font-heading text-[30px] font-bold text-heading"
        >
          {heading}
        </h1>
      </div>
      {children}
      <ContactLine />
    </section>
  );
}

/**
 * A waiting request: who asked, the details, then the answer.
 *
 * @returns the card
 */
function WaitingCard({ state, request }: { state: ConsentState; request: ConsentRequestDetails }) {
  const { t } = useTranslation('account');
  const intro = t('parentConsent.parent.intro', {
    email: request.writerEmail,
    handle: request.handle,
    year: request.birthYear ?? '',
  });
  return (
    <AnswerCard heading={t('parentConsent.parent.heading')}>
      <p className="m-0 text-body">{intro}</p>
      <ParentAnswerDetails request={request} />
      <ParentAnswerForm
        deadline={request.deadline}
        isAnswering={state.isAnswering}
        failure={state.answerFailure}
        onAnswer={(decision, isGuardian, allowSpotlight) => {
          void state
            .answer({
              token: state.token,
              decision,
              language: request.language,
              isGuardian,
              allowSpotlight,
            })
            .catch(errorShownByHook);
        }}
      />
    </AnswerCard>
  );
}

/**
 * The card for a link that no longer works.
 *
 * @returns the card
 */
function GoneCard() {
  const { t } = useTranslation('account');
  return (
    <AnswerCard heading={t('parentConsent.parent.goneHeading')}>
      <p className="m-0 text-body">{t('parentConsent.parent.goneBody')}</p>
    </AnswerCard>
  );
}

/**
 * The card for an answered request.
 *
 * @returns the card
 */
function AnsweredCard({ state, request }: { state: ConsentState; request: ConsentRequestDetails }) {
  const { t, i18n } = useTranslation('account');
  return (
    <AnswerCard heading={t('parentConsent.parent.documentTitle')}>
      <ParentAnswerOutcome
        request={request}
        isAnswering={state.isAnswering}
        failure={state.answerFailure}
        onWithdraw={() => {
          const language = i18n.language === 'en' ? 'en' : 'ro';
          void state
            .answer({
              token: state.token,
              decision: 'withdraw',
              language,
              isGuardian: false,
              allowSpotlight: false,
            })
            .catch(errorShownByHook);
        }}
      />
    </AnswerCard>
  );
}

/**
 * Picks the card for where the request stands.
 *
 * @returns the card, a wait or an error
 */
function ParentAnswerBody({ state }: { state: ConsentState }) {
  const { t } = useTranslation('account');
  if (state.loadFailed) return <Notice tone="error">{t('parentConsent.loadFailed')}</Notice>;
  if (state.request === undefined)
    return <p className="m-0 text-body">{t('parentConsent.parent.loading')}</p>;
  if (state.request === null) return <GoneCard />;
  if (state.request.status === 'waiting')
    return <WaitingCard state={state} request={state.request} />;
  return <AnsweredCard state={state} request={state.request} />;
}

/**
 * Renders the page.
 *
 * @returns the parent's consent screen
 */
export function ParentAnswerPage() {
  const { t } = useTranslation('account');
  const token = useLocation().hash.replace(/^#/, '');
  const state = useConsentRequest(token);
  useRequestLanguage(state.request);
  return (
    <PageContainer className="tmc-rise flex justify-center pt-12 pb-7">
      <title>{t('parentConsent.parent.documentTitle')}</title>
      <ParentAnswerBody state={state} />
    </PageContainer>
  );
}
