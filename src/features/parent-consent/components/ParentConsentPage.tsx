/**
 * ParentConsentPage: "Ask a parent or guardian", screen 2.4, the writer's side (story S1-E2-03;
 * board ParentConsent.dc.html, left column and "What happens next").
 *
 * Who shows it: the router, at /parent-consent. ParentConsentNotice and the consent
 * notifications link here.
 * What it shows, from my_parental_consent():
 * - before the first email, or after "Change the email": AskParentForm (criterion 1);
 * - while the parent hasn't answered: ConsentSentPanel with the deadline (criterion 4);
 * - after a yes: "Your account is ready" (criterion 2);
 * - after a withdrawal: the account is read-only (criterion 5).
 * Signed out, it asks the writer to log in. Plain page: no doodles near the form.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { useSession } from '@/features/auth/hooks/useSession';
import { formatRomaniaDate } from '@/lib/romania-time';

import type { MyParentConsent } from '../api/parentConsent';
import { useMyParentConsent } from '../hooks/useMyParentConsent';

import { AskParentForm } from './AskParentForm';
import { ConsentSentPanel } from './ConsentSentPanel';

/** The class of a link drawn as a secondary button. */
const linkButtonClass =
  'inline-flex h-11 items-center self-start rounded-full border border-control-border bg-surface px-5 text-sm font-semibold text-heading no-underline hover:bg-tint';

/** useMyParentConsent's result, passed down once. */
type Consent = ReturnType<typeof useMyParentConsent>;

/**
 * "Your account is ready", after a parent or guardian agreed.
 *
 * @returns the block
 */
function AgreedPanel({ consent }: { consent: MyParentConsent }) {
  const { t, i18n } = useTranslation('account');
  const date =
    consent.decidedAt === null ? '' : formatRomaniaDate(new Date(consent.decidedAt), i18n.language);
  return (
    <div className="flex flex-col gap-4">
      <Notice tone="success" title={t('parentConsent.agreedHeading')}>
        {t('parentConsent.agreedBody', { date })}
      </Notice>
      <Link to="/settings" className={linkButtonClass}>
        {t('parentConsent.setUpProfile')}
      </Link>
    </div>
  );
}

/**
 * The asking part: the form, or the sent state with its actions.
 *
 * @returns the block
 */
function AskingPanel({ state, consent }: { state: Consent; consent: MyParentConsent }) {
  const { i18n } = useTranslation('account');
  const [isChanging, setIsChanging] = useState(false);
  const [hasResent, setHasResent] = useState(false);
  const isWaiting = consent.status === 'waiting' && consent.parentEmail !== null;

  if (isWaiting && !isChanging) {
    const resendState = hasResent ? (state.sendFailure ?? (state.wasSent ? 'sent' : null)) : null;
    return (
      <ConsentSentPanel
        consent={consent}
        isSending={state.isSending}
        resendState={resendState}
        onResend={() => {
          setHasResent(true);
          void state
            .send({ parentEmail: consent.parentEmail ?? '', language: consent.language ?? 'ro' })
            .catch(() => undefined);
        }}
        onChange={() => setIsChanging(true)}
      />
    );
  }
  return (
    <AskParentForm
      initialLanguage={consent.language ?? (i18n.language === 'en' ? 'en' : 'ro')}
      isSending={state.isSending}
      failure={hasResent ? null : state.sendFailure}
      onSend={async (request) => {
        setHasResent(false);
        await state.send(request);
        setIsChanging(false);
      }}
    />
  );
}

/**
 * The card's body for a writer whose consent has loaded.
 *
 * @returns the right block for where the consent stands
 */
function ConsentBody({ state, consent }: { state: Consent; consent: MyParentConsent }) {
  const { t } = useTranslation('account');
  if (consent.status === 'withdrawn') {
    return (
      <Notice tone="warning" title={t('parentConsent.withdrawnHeading')}>
        {t('parentConsent.withdrawnBody')}
      </Notice>
    );
  }
  if (consent.status === 'agreed' && !consent.needsConsent)
    return <AgreedPanel consent={consent} />;
  if (consent.canSend) return <AskingPanel state={state} consent={consent} />;
  return <p className="m-0 text-body">{t('parentConsent.nothingToDo')}</p>;
}

/**
 * The card's body: a wait, the signed-out line, an error, or the consent.
 *
 * @returns the body
 */
function ParentConsentCardBody() {
  const { t } = useTranslation('account');
  const { userId, isKnown } = useSession();
  const state = useMyParentConsent();
  if (!isKnown) return null;
  if (userId === null) {
    return (
      <div className="flex flex-col gap-3">
        <p className="m-0 text-body">{t('parentConsent.signedOut')}</p>
        <Link to="/sign-in" className={linkButtonClass}>
          {t('parentConsent.logIn')}
        </Link>
      </div>
    );
  }
  if (state.loadFailed) return <Notice tone="error">{t('parentConsent.loadFailed')}</Notice>;
  if (state.consent === undefined) return null;
  if (state.consent === null)
    return <p className="m-0 text-body">{t('parentConsent.nothingToDo')}</p>;
  return <ConsentBody state={state} consent={state.consent} />;
}

/**
 * Renders the page.
 *
 * @returns the writer's consent screen
 */
export function ParentConsentPage() {
  const { t } = useTranslation('account');
  return (
    <PageContainer className="tmc-rise flex justify-center pt-12 pb-7">
      <title>{t('parentConsent.documentTitle')}</title>
      <section
        aria-labelledby="parent-consent-heading"
        className="flex w-full max-w-[640px] flex-col gap-5 rounded-card border border-border bg-surface p-[clamp(20px,5vw,32px)] shadow-card"
      >
        <div className="flex flex-col gap-2">
          <Eyebrow>{t('parentConsent.eyebrow')}</Eyebrow>
          <h1
            id="parent-consent-heading"
            className="m-0 font-heading text-[30px] font-bold text-heading"
          >
            {t('parentConsent.heading')}
          </h1>
          <p className="m-0 text-body">{t('parentConsent.intro')}</p>
        </div>
        <ParentConsentCardBody />
      </section>
    </PageContainer>
  );
}
