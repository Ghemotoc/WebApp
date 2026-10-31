/**
 * SafetyStep: step 3 for under-18s, "Staying safe here" (story S1-E2-06, criterion 3; board
 * Onboarding 2.5).
 *
 * Who shows it: OnboardingPage, only for the 13-to-15 and 16-to-17 age groups. What it shows:
 * how to block and report, who can message them, and the community guidelines in short with a
 * link to the full text. Messages (S1-E9-03; decided 16 Oct 2026, Q13): under-16s can never be
 * messaged by adults, so they read a line; a 16 or 17-year-old gets "Let adults message me", off
 * until they tick it, saved at once through set_adults_may_message().
 * "Skip" and "Go to Discover" both finish setup (the parent's onFinish).
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import type { MyOnboarding } from '../api/onboarding';
import type { useMyOnboarding } from '../hooks/useMyOnboarding';

import { AdultMessagesSwitch } from './AdultMessagesSwitch';

/** The four short guidelines, in the board's order. */
const guidelineKeys = ['guidelineKind', 'guidelineOwnWork', 'guidelinePrivate', 'guidelineRate'];

/**
 * One titled block of the step.
 *
 * @returns the block
 */
function SafetyBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="m-0 font-heading text-base font-semibold text-heading">{title}</h3>
      {children}
    </section>
  );
}

/**
 * Who can message them: a line for under-16s, the switch for 16 and 17-year-olds.
 *
 * @returns the block's body
 */
function MessagesBody(props: {
  onboarding: MyOnboarding;
  state: ReturnType<typeof useMyOnboarding>;
}) {
  const { t } = useTranslation('account');
  if (props.onboarding.ageBand !== '16_to_17') {
    return <p className="m-0 text-body">{t('onboarding.safety.messagesUnder16')}</p>;
  }
  return (
    <AdultMessagesSwitch
      id="onboarding-adult-messages"
      onboarding={props.onboarding}
      state={props.state}
    />
  );
}

/**
 * Renders the step.
 *
 * @param props.onboarding - the person's setup
 * @param props.state - useMyOnboarding's result
 * @param props.onFinish - finishes setup and goes to Discover
 * @returns the blocks and the buttons
 */
export function SafetyStep(props: {
  onboarding: MyOnboarding;
  state: ReturnType<typeof useMyOnboarding>;
  onFinish: () => void;
}) {
  const { t } = useTranslation('account');
  return (
    <div className="flex flex-col gap-5">
      <SafetyBlock title={t('onboarding.safety.blockHeading')}>
        <p className="m-0 text-body">{t('onboarding.safety.blockBody')}</p>
      </SafetyBlock>
      <SafetyBlock title={t('onboarding.safety.reportHeading')}>
        <p className="m-0 text-body">{t('onboarding.safety.reportBody')}</p>
      </SafetyBlock>
      <SafetyBlock title={t('onboarding.safety.messagesHeading')}>
        <MessagesBody onboarding={props.onboarding} state={props.state} />
      </SafetyBlock>
      <SafetyBlock title={t('onboarding.safety.guidelinesHeading')}>
        <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-body">
          {guidelineKeys.map((key) => (
            <li key={key}>{t(`onboarding.safety.${key}`)}</li>
          ))}
        </ul>
        <Link to="/legal/guidelines" className="text-link underline hover:text-link-hover">
          {t('onboarding.safety.fullGuidelines')}
        </Link>
      </SafetyBlock>
      {props.state.saveFailed && <Notice tone="error">{t('onboarding.saveFailed')}</Notice>}
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" disabled={props.state.isSaving} onClick={props.onFinish}>
          {t('onboarding.skip')}
        </Button>
        <Button disabled={props.state.isSaving} onClick={props.onFinish}>
          {t('onboarding.goToDiscover')}
        </Button>
      </div>
    </div>
  );
}
