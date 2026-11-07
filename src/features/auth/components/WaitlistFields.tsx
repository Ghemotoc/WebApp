/**
 * WaitlistFields: the waiting list's two extra answers on the sign-up form (bundle WAITLIST-1,
 * story S1-E2-24).
 *
 * 1. "What do you want to do here?" Write, Read or Both: one question, so staff can let writers
 *    in first (Staff › Waitlist). Drawn as ChoiceChips (a radio group).
 * 2. "Send me occasional news": a separate opt-in, never ticked for the person (consent; Law
 *    506/2004). The database keeps it only for someone 18 or over (Q50), so the label says so.
 * Who shows it: SignUpForm, only while the 'waitlist' flag is on and the person has no invite
 * code (an invite skips the queue, so its question isn't needed).
 * What it calls: nothing; the answers go with the sign-up (api/signUp.ts, waitlistData()).
 */
import { useTranslation } from 'react-i18next';

import { ChoiceChips } from '@/components/ui/ChoiceChips';

import type { useSignUpForm } from '../hooks/useSignUpForm';

/** The choices, in the order the question reads. */
const interests = ['write', 'read', 'both'] as const;

/**
 * Renders the question and the news box.
 *
 * @param props.form - the sign-up form's state
 * @returns the two fields
 */
export function WaitlistFields({ form }: { form: ReturnType<typeof useSignUpForm> }) {
  const { t } = useTranslation('auth');
  const { answers, setField, problems } = form;
  const problem = problems.waitlistInterest;
  return (
    <>
      <ChoiceChips
        label={t('signUp.waitlist.interestLabel')}
        isLabelVisible
        options={interests.map((interest) => ({
          value: interest,
          label: t(`signUp.waitlist.interest.${interest}`),
        }))}
        value={answers.waitlistInterest}
        onChange={(value) => setField('waitlistInterest', value as (typeof interests)[number])}
        descriptionId="sign-up-interest-note"
        description={
          problem === undefined ? (
            t('signUp.waitlist.interestHint')
          ) : (
            <span className="text-destructive">{t(problem)}</span>
          )
        }
      />
      <div className="flex items-start gap-3">
        <input
          id="sign-up-news"
          type="checkbox"
          checked={answers.newsEmails}
          onChange={(event) => setField('newsEmails', event.target.checked)}
          className="mt-0.5 size-6 shrink-0 cursor-pointer accent-(--link)"
        />
        <label htmlFor="sign-up-news" className="text-[15px] text-body">
          {t('signUp.waitlist.news')}
        </label>
      </div>
    </>
  );
}
