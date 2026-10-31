/**
 * AgeCheckPage: "Confirm your age", screen 2.3 (story S1-E2-08, part 08a; board
 * AgeCheck.dc.html).
 *
 * Who shows it: the router, at /age-check. AgeCheckNotice and the return page link here.
 * What it shows: the line being checked (13 or 18, from my_age_check()), the two methods, what we
 * keep and "Continue with Yoti" (AgeCheckStartPanel), with the three steps beside it. A check
 * already done shows its result instead; with nothing to check it says so. Signed out, it asks
 * the person to log in. The board's "Ask for a manual check" link comes with part 08b.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { useSession } from '@/features/auth/hooks/useSession';

import type { MyAgeCheck } from '../api/ageCheck';
import { useMyAgeCheck } from '../hooks/useMyAgeCheck';

import { AgeCheckResultSummary } from './AgeCheckResultSummary';
import { AgeCheckStartPanel } from './AgeCheckStartPanel';
import { AgeCheckSteps } from './AgeCheckSteps';

/** The class of a link drawn as a secondary button. */
const linkButtonClass =
  'inline-flex h-11 items-center self-start rounded-full border border-control-border bg-surface px-5 text-sm font-semibold text-heading no-underline hover:bg-tint';

/**
 * What a check that can't start shows: its result when there is one, otherwise "nothing to do"
 * with the way to the year of birth in Settings.
 *
 * @param props.check - the person's check
 * @returns the block
 */
function NoCheckToDo({ check }: { check: MyAgeCheck }) {
  const { t } = useTranslation('account');
  if (check.result === '18_or_over' || check.result === '13_or_over') {
    return <AgeCheckResultSummary check={check} />;
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-body">{t('ageCheck.nothingToDo')}</p>
      <p className="m-0 text-body">{t('ageCheck.birthYearInSettings')}</p>
      <Link to="/settings" className={linkButtonClass}>
        {t('ageCheck.openSettings')}
      </Link>
    </div>
  );
}

/**
 * The card's body: a wait, the signed-out line, an error, the result or the start panel.
 *
 * @returns the body
 */
function AgeCheckCardBody() {
  const { t } = useTranslation('account');
  const { userId, isKnown } = useSession();
  const { check, loadFailed } = useMyAgeCheck();
  if (!isKnown) return null;
  if (userId === null) {
    return (
      <div className="flex flex-col gap-3">
        <p className="m-0 text-body">{t('ageCheck.signedOut')}</p>
        <Link to="/sign-in" className={linkButtonClass}>
          {t('ageCheck.logIn')}
        </Link>
      </div>
    );
  }
  if (loadFailed) return <Notice tone="error">{t('ageCheck.loadFailed')}</Notice>;
  if (check === undefined) return null;
  if (check === null) return <p className="m-0 text-body">{t('ageCheck.nothingToDo')}</p>;
  if (!check.canStart) return <NoCheckToDo check={check} />;
  return <AgeCheckStartPanel />;
}

/**
 * Renders the page.
 *
 * @returns the age check screen
 */
export function AgeCheckPage() {
  const { t } = useTranslation('account');
  const { check } = useMyAgeCheck();
  // The 18 line is checked when the year of birth says 18 or over; otherwise the 13 line.
  const intro = check?.threshold === 18 ? t('ageCheck.intro18') : t('ageCheck.intro13');

  return (
    <PageContainer className="tmc-rise grid gap-6 pt-12 pb-7 min-[1000px]:grid-cols-[minmax(0,1fr)_360px] min-[1000px]:items-start">
      <title>{t('ageCheck.documentTitle')}</title>
      <section
        aria-labelledby="age-check-heading"
        className="flex flex-col gap-5 rounded-card border border-border bg-surface p-[clamp(20px,5vw,32px)] shadow-card"
      >
        <div className="flex flex-col gap-2">
          <Eyebrow>{t('ageCheck.eyebrow')}</Eyebrow>
          <h1
            id="age-check-heading"
            className="m-0 font-heading text-[30px] font-bold text-heading"
          >
            {t('ageCheck.heading')}
          </h1>
          <p className="m-0 text-body">{intro}</p>
        </div>
        <AgeCheckCardBody />
        <p className="m-0 text-sm text-meta">{t('ageCheck.byYoti')}</p>
      </section>
      <AgeCheckSteps />
    </PageContainer>
  );
}
