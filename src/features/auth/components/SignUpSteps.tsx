/**
 * SignUpSteps: the row of step pills at the top of the sign-up card, board 2.1 (story S1-E2-01).
 *
 * The board shows three steps: your account, age check, your profile. While adults_only is on
 * (the March test, decided 17 Oct 2026, 12:44) there is no age check, so that step is left out
 * rather than promising one that never comes. The current step is plum with a gold number and
 * aria-current="step".
 * Who uses it: SignUpPage.
 */
import { useTranslation } from 'react-i18next';

/** What the steps need. */
interface SignUpStepsProps {
  /** True while the age check is part of sign-up (adults_only off and Yoti live, S1-E2-08). */
  includesAgeCheck: boolean;
}

/**
 * Renders the steps, the first one current.
 *
 * @returns an ordered list of pills
 */
export function SignUpSteps({ includesAgeCheck }: SignUpStepsProps) {
  const { t } = useTranslation('auth');
  const stepKeys = includesAgeCheck ? ['account', 'ageCheck', 'profile'] : ['account', 'profile'];
  return (
    <ol aria-label={t('signUp.steps.label')} className="m-0 flex list-none flex-wrap gap-2 p-0">
      {stepKeys.map((key, index) => {
        const isCurrent = index === 0;
        return (
          <li
            key={key}
            aria-current={isCurrent ? 'step' : undefined}
            className={
              isCurrent
                ? 'inline-flex h-8 items-center gap-2 rounded-full bg-heading px-3 text-[13px] font-semibold text-on-primary'
                : 'inline-flex h-8 items-center gap-2 rounded-full border border-panel-border bg-panel px-3 text-[13px] font-semibold text-body'
            }
          >
            <span
              aria-hidden="true"
              className={`inline-flex size-5 items-center justify-center rounded-full text-[12px] ${isCurrent ? 'bg-gold text-on-gold' : 'bg-surface'}`}
            >
              {index + 1}
            </span>
            {t(`signUp.steps.${key}`)}
            {isCurrent && <span className="sr-only">{t('signUp.steps.current')}</span>}
          </li>
        );
      })}
    </ol>
  );
}
