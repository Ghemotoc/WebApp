/**
 * AgeRefusal: what sign-up says when the age rules refuse someone (story S1-E2-02).
 *
 * Under 13 (decided 17 Oct 2026, canvas comment): "Sorry, you can't create an account right now.
 * We don't keep anything you typed. You can try again once you turn 13." No device or IP block.
 * Under 18 while adults_only is on (the March test, decided 17 Oct 2026, 12:44): a kind note that
 * the test is for invited adults (copy accepted with the epic plan, 19:43).
 * Under the country's own minimum age (S1-E2-10; Australia is 16 and over, Q19): "{{productName}}
 * isn't open to under-16s in Australia yet."
 * By the time this shows, the form's answers have been cleared and nothing was sent.
 * Who uses it: SignUpCardBody, in place of the form.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import type { AgeRefusalReason } from '../hooks/useSignUpForm';

/** What the refusal needs. */
interface AgeRefusalProps {
  reason: AgeRefusalReason;
  /** The visitor's country code, named in the under_market_age message. */
  country: string | null;
  /** The country's minimum age, named in the same message. */
  minimumAge: number;
}

/**
 * The refusal's sentence.
 *
 * @param props - the refusal's reason, country and minimum age
 * @returns the sentence, in the interface language
 */
function useRefusalText({ reason, country, minimumAge }: AgeRefusalProps): string {
  const { t, i18n } = useTranslation('auth');
  if (reason === 'under_13') return t('signUp.refusal.under13');
  if (reason === 'adults_only') return t('signUp.refusal.adultsOnly');
  const countryName =
    country === null
      ? t('signUp.refusal.yourCountry')
      : (new Intl.DisplayNames([i18n.language], { type: 'region' }).of(country) ?? country);
  return t('signUp.refusal.underMarketAge', { country: countryName, age: minimumAge });
}

/**
 * Renders the refusal.
 *
 * @returns an alert with the reason and a link to who can join
 */
export function AgeRefusal(props: AgeRefusalProps) {
  const { t } = useTranslation('auth');
  const text = useRefusalText(props);
  return (
    <div role="alert" className="flex flex-col gap-3 border-t-[3px] border-destructive pt-4">
      <h3 className="m-0 font-heading text-[22px] font-bold text-heading">
        {t('signUp.refusal.heading')}
      </h3>
      <p className="m-0 text-body">{text}</p>
      <Link to="/legal/terms" className="self-start text-link underline hover:text-link-hover">
        {t('signUp.refusal.readWhoCanJoin')}
      </Link>
    </div>
  );
}
