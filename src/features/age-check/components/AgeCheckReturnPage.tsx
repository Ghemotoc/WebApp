/**
 * AgeCheckReturnPage: where Yoti sends the person back, /age-check/return (story S1-E2-08, part
 * 08a; board AgeCheck.dc.html, "After the check").
 *
 * Who shows it: the router. Yoti's hosted page (or the stand-in) sends the person here when they
 * finish or cancel; ?cancelled=1 marks a cancel.
 * What it shows: "Checking your age" while the result is on its way (it reads my_age_check()
 * every 2 seconds and stops waiting after a minute), then one of the messages lib/returnOutcome.ts
 * picks, each with its next step. The result itself arrives only by Yoti's signed notification,
 * never from this page or its address (criterion 4).
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { useSession } from '@/features/auth/hooks/useSession';

import type { MyAgeCheck } from '../api/ageCheck';
import { useMyAgeCheck } from '../hooks/useMyAgeCheck';
import { returnOutcome } from '../lib/returnOutcome';

import { AgeCheckResultSummary } from './AgeCheckResultSummary';
import { StartAgeCheckButton } from './StartAgeCheckButton';

/** How often the page reads the check again while waiting. */
const pollEveryMs = 2000;

/** How long the page waits for Yoti's notification before saying the check wasn't finished. */
const giveUpAfterMs = 60_000;

/**
 * A heading with a line under it.
 *
 * @returns the message
 */
function Message({ heading, body }: { heading: string; body: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="m-0 font-heading text-[28px] font-bold text-heading">{heading}</h1>
      <p className="m-0 text-body">{body}</p>
    </div>
  );
}

/**
 * The message and next step for one outcome.
 *
 * @param props.check - the person's check
 * @param props.wasCancelled - the person cancelled on Yoti's page
 * @param props.hasWaited - the page stopped waiting
 * @returns the message block
 */
function ReturnMessage(props: { check: MyAgeCheck; wasCancelled: boolean; hasWaited: boolean }) {
  const { t } = useTranslation('account');
  const outcome = returnOutcome(props.check, props.wasCancelled, props.hasWaited);
  if (outcome === 'checking') {
    return (
      <div role="status">
        <Message
          heading={t('ageCheck.return.checkingHeading')}
          body={t('ageCheck.return.checkingBody')}
        />
      </div>
    );
  }
  if (outcome === 'adult' || outcome === 'teen' || outcome === 'teen_with_adult_year') {
    return <PassedMessage check={props.check} offerDocument={outcome === 'teen_with_adult_year'} />;
  }
  if (outcome === 'failed') {
    return (
      <>
        <Message
          heading={t('ageCheck.return.failedHeading')}
          body={t('ageCheck.return.failedBody')}
        />
        {props.check.canStart ? (
          <StartAgeCheckButton label={t('ageCheck.return.tryAgain')} />
        ) : null}
      </>
    );
  }
  const stopped = outcome === 'cancelled' ? 'cancelled' : 'notFinished';
  return (
    <>
      <Message
        heading={t(`ageCheck.return.${stopped}Heading`)}
        body={t(`ageCheck.return.${stopped}Body`)}
      />
      <StartAgeCheckButton label={t('ageCheck.return.startAgain')} />
    </>
  );
}

/**
 * A pass: the result, "Continue" home and, for an adult year with only "13 or over", the ID
 * document route to an "18 or over" result (criterion 6).
 *
 * @returns the block
 */
function PassedMessage({ check, offerDocument }: { check: MyAgeCheck; offerDocument: boolean }) {
  const { t } = useTranslation('account');
  return (
    <>
      <AgeCheckResultSummary check={check} />
      {offerDocument ? (
        <div className="flex flex-col gap-3">
          <p className="m-0 text-body">{t('ageCheck.return.adultYearBody')}</p>
          <StartAgeCheckButton label={t('ageCheck.return.useDocument')} variant="secondary" />
        </div>
      ) : null}
      <Link
        to="/"
        className="inline-flex h-12 items-center self-start rounded-full bg-primary px-6 text-[15px] font-semibold text-on-primary no-underline hover:opacity-90"
      >
        {t('ageCheck.continue')}
      </Link>
    </>
  );
}

/**
 * Renders the page.
 *
 * @returns the return screen
 */
export function AgeCheckReturnPage() {
  const { t } = useTranslation('account');
  const { userId, isKnown } = useSession();
  const { check, loadFailed } = useMyAgeCheck(pollEveryMs);
  const [searchParams] = useSearchParams();
  const [hasWaited, setHasWaited] = useState(false);
  // Stop waiting after a minute: a closed or expired session never sends a result.
  useEffect(() => {
    const timer = window.setTimeout(() => setHasWaited(true), giveUpAfterMs);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <PageContainer className="tmc-rise flex justify-center pt-12 pb-7">
      <title>{t('ageCheck.return.documentTitle')}</title>
      <section className="flex w-full max-w-[560px] flex-col gap-5 rounded-card border border-border bg-surface p-[clamp(20px,5vw,32px)] shadow-card">
        {isKnown && userId === null ? (
          <p className="m-0 text-body">{t('ageCheck.signedOut')}</p>
        ) : null}
        {loadFailed ? <Notice tone="error">{t('ageCheck.loadFailed')}</Notice> : null}
        {check != null ? (
          <ReturnMessage
            check={check}
            wasCancelled={searchParams.get('cancelled') === '1'}
            hasWaited={hasWaited}
          />
        ) : null}
      </section>
    </PageContainer>
  );
}
