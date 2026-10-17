/**
 * AgeRefusal: what sign-up says when the age rules refuse someone (story S1-E2-02).
 *
 * Under 13 (decided 17 Oct 2026, canvas comment): "Sorry, you can't create an account right now.
 * We don't keep anything you typed. You can try again once you turn 13." No device or IP block.
 * Under 18 while adults_only is on (the March test, decided 17 Oct 2026, 12:44): a kind note that
 * the test is for invited adults (copy accepted with the epic plan, 19:43).
 * By the time this shows, the form's answers have been cleared and nothing was sent.
 * Who uses it: SignUpCardBody, in place of the form.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

/** What the refusal needs. */
interface AgeRefusalProps {
  reason: 'under_13' | 'adults_only';
}

/**
 * Renders the refusal.
 *
 * @returns an alert with the reason and a link to who can join
 */
export function AgeRefusal({ reason }: AgeRefusalProps) {
  const { t } = useTranslation('auth');
  return (
    <div role="alert" className="flex flex-col gap-3 border-t-[3px] border-destructive pt-4">
      <h3 className="m-0 font-heading text-[22px] font-bold text-heading">
        {t('signUp.refusal.heading')}
      </h3>
      <p className="m-0 text-body">
        {t(reason === 'under_13' ? 'signUp.refusal.under13' : 'signUp.refusal.adultsOnly')}
      </p>
      <Link to="/legal/terms" className="self-start text-link underline hover:text-link-hover">
        {t('signUp.refusal.readWhoCanJoin')}
      </Link>
    </div>
  );
}
