/**
 * ParentSpotlightPage: the one-question page a parent opens to say whether their child, aged 13
 * to 15, may be suggested to other readers (story S1-E2-03b, bundle LOOK-4c; Robert, 6 Nov 2026,
 * D4; GDPR art. 7 and 8: a separate consent, as easy to withdraw as to give).
 *
 * Who shows it: the router, at /parent-consent/spotlight. The link is
 * /parent-consent/spotlight#<token>, from the "may we suggest your child?" email or the consent
 * email's own link; the token sits after "#", so it never reaches a server log.
 * What it shows, from useSpotlightRequest(token): what suggesting means, then "Yes, you may" while
 * there is no yes, or "Stop suggesting them" while there is one; a link that no longer works
 * says so. Works signed out, switches to the parent's language once, plain page: no doodles.
 */
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { errorShownByHook } from '@/lib/errorShownByHook';

import type { SpotlightRequestDetails } from '../api/parentConsent';
import { useSpotlightRequest } from '../hooks/useSpotlightRequest';

import { ContactLine } from './ContactLine';
import { writtenLanguageFor } from '@/schemas/interfaceLanguages';
import { useParentConsentTranslation } from '../registerParentConsentTranslations';

/** useSpotlightRequest's result, passed down once. */
type SpotlightState = ReturnType<typeof useSpotlightRequest>;

/**
 * Switches the page to the parent's language once, when the link first loads.
 *
 * @param request - the loaded details, or null and undefined before that
 */
function useParentLanguage(request: SpotlightRequestDetails | null | undefined) {
  const { i18n } = useTranslation();
  const hasSwitched = useRef(false);
  useEffect(() => {
    if (hasSwitched.current || request === null || request === undefined) return;
    hasSwitched.current = true;
    if (i18n.language !== request.language) void i18n.changeLanguage(request.language);
  }, [request, i18n]);
}

/**
 * What suggesting means, then the one button for where the yes stands.
 *
 * @returns the card's body
 */
function SpotlightQuestion({
  state,
  request,
}: {
  state: SpotlightState;
  request: SpotlightRequestDetails;
}) {
  const { t, i18n } = useParentConsentTranslation();
  const language = writtenLanguageFor(i18n.language);
  const decision = request.isAgreed ? 'withdraw' : 'agree';
  return (
    <>
      <p className="m-0 text-ink-muted">{t('spotlight.intro', { handle: request.handle })}</p>
      <ul className="m-0 flex list-disc flex-col gap-2 pl-4 text-ink-muted">
        <li>{t('spotlight.whereShown')}</li>
        <li>{t('spotlight.whatShown')}</li>
        <li>{t('spotlight.whatNot')}</li>
      </ul>
      {request.isAgreed && (
        <Notice tone="success">{t('spotlight.agreedNow', { handle: request.handle })}</Notice>
      )}
      {state.answerFailure !== null && (
        <Notice tone="error">{t(`failures.${state.answerFailure}`)}</Notice>
      )}
      <Button
        variant={request.isAgreed ? 'secondary' : 'primary'}
        disabled={state.isAnswering}
        className="self-start"
        onClick={() => {
          void state.answer({ token: state.token, decision, language }).catch(errorShownByHook);
        }}
      >
        {t(request.isAgreed ? 'spotlight.withdraw' : 'spotlight.agree')}
      </Button>
      <p className="m-0 type-body text-ink-muted">{t('spotlight.noAnswer')}</p>
    </>
  );
}

/**
 * Picks what the card says for where the link stands.
 *
 * @returns the card's heading and body
 */
function SpotlightBody({ state }: { state: SpotlightState }) {
  const { t } = useParentConsentTranslation();
  if (state.loadFailed) return <Notice tone="error">{t('loadFailed')}</Notice>;
  if (state.request === undefined)
    return <p className="m-0 text-ink-muted">{t('parent.loading')}</p>;
  if (state.request === null) return <p className="m-0 text-ink-muted">{t('parent.goneBody')}</p>;
  return <SpotlightQuestion state={state} request={state.request} />;
}

/**
 * Renders the page.
 *
 * @returns the parent's suggestions screen
 */
export function ParentSpotlightPage() {
  const { t } = useParentConsentTranslation();
  const token = useLocation().hash.replace(/^#/, '');
  const state = useSpotlightRequest(token);
  useParentLanguage(state.request);
  const heading = state.request === null ? t('parent.goneHeading') : t('spotlight.heading');
  return (
    <PageContainer className="tmc-rise flex justify-center pt-12 pb-6">
      <title>{t('spotlight.documentTitle')}</title>
      <section
        aria-labelledby="parent-spotlight-heading"
        className="flex w-full max-w-[720px] flex-col gap-4 rounded-card border border-border bg-surface p-[clamp(20px,5vw,32px)] shadow-card"
      >
        <div className="flex flex-col gap-2">
          <Eyebrow>{t('parent.eyebrow')}</Eyebrow>
          <h1
            id="parent-spotlight-heading"
            className="m-0 font-heading type-title font-bold text-ink-heading"
          >
            {heading}
          </h1>
        </div>
        <SpotlightBody state={state} />
        <ContactLine />
      </section>
    </PageContainer>
  );
}
