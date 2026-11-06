/**
 * CountryQuestionNotice: "Which country do you live in?", asked once of a signed-in member who
 * never said (bundle MARKETS-1, story S1-E2-20, criterion 3).
 *
 * Why: before MARKETS-1 the country came only from the connection at sign-up; now the ages that
 * apply follow where a person lives, so each existing member is asked once. Once they save, the
 * question doesn't come back (profiles.country_chosen_at); they can change it in Settings.
 * Who shows it: AppLayout, under LegalUpdateNotice, on every page except Settings (which has the
 * same choice in its Account panel).
 * What it calls: useMyNames for the country, CountryChangeForm to save it. Signed out, or
 * already answered: nothing.
 */
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';

import { PageContainer } from '@/components/ui/PageContainer';

import { useMyNames } from '../hooks/useMyNames';

import { CountryChangeForm } from './CountryChangeForm';

/**
 * Renders the question, or nothing.
 *
 * @returns the panel while the member hasn't said where they live
 */
export function CountryQuestionNotice() {
  const { t } = useTranslation('account');
  const { pathname } = useLocation();
  const { names } = useMyNames();
  if (names == null || names.countryChosenAt !== null || pathname.startsWith('/settings'))
    return null;

  return (
    <PageContainer className="pt-6">
      <section
        aria-labelledby="country-question-title"
        className="flex flex-col gap-3 rounded-card border border-border bg-tint p-6"
      >
        <h2
          id="country-question-title"
          className="m-0 font-heading text-[24px] font-bold text-heading"
        >
          {t('country.question.heading')}
        </h2>
        <p className="m-0 text-body">{t('country.question.body')}</p>
        <CountryChangeForm
          idPrefix="country-question"
          startCountry={names.countryCode ?? ''}
          startRegion={names.legalRegionCode}
        />
      </section>
    </PageContainer>
  );
}
