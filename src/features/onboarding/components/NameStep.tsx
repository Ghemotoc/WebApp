/**
 * NameStep: step 1, "Your name and language" (story S1-E2-06, criterion 1; board Onboarding 2.5).
 *
 * Who shows it: OnboardingPage. What it shows:
 * - the username and pen name (SetupForm) only for an account without a username, because the
 *   username is chosen at sign-up since 25 Oct 2026 (docs/board-fixes.md);
 * - the interface language, saved to the account at once (useInterfaceLanguage, S1-E1-04);
 * - a line naming the country, which comes from the connection (S1-E2-10);
 * - the optional county, listing only that country's counties and hidden for a country with none
 *   (COUNTRY-2, trial bug, 26 Nov 2026: a person in Sweden saw Romania's counties).
 * "Next" saves the county if it changed, then moves on.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Select } from '@/components/ui/Select';
import { SetupForm } from '@/features/account/components/SetupForm';
import { useMyNames } from '@/features/account/hooks/useMyNames';
import { useInterfaceLanguage } from '@/features/language/hooks/useInterfaceLanguage';
import { useLanguageOptions } from '@/features/language/hooks/useLanguageOptions';
import { countryName } from '@/features/safety/lib/countries';
import { isSupportedLanguage } from '@/lib/i18n';

import { regionsOfCountry, shownRegionCode, type MyOnboarding } from '../api/onboarding';
import type { useMyOnboarding } from '../hooks/useMyOnboarding';
import { useOnboardingChoices } from '../hooks/useOnboardingChoices';

import { RegionSelect } from './RegionSelect';
import { errorShownByHook } from '@/lib/errorShownByHook';

/**
 * The interface language drop-down and its hint.
 *
 * @returns the field
 */
function LanguageField() {
  const { t } = useTranslation('account');
  const { language, changeLanguage } = useInterfaceLanguage();
  // The open interface languages, each named in its own language (WCAG 3.1.2; MARKETS-2a).
  const languageOptions = useLanguageOptions();
  return (
    <div className="flex flex-col gap-2">
      <Select
        id="onboarding-language"
        label={t('onboarding.name.languageLabel')}
        isLabelVisible
        options={languageOptions}
        value={language}
        onChange={(value) => {
          if (isSupportedLanguage(value)) void changeLanguage(value);
        }}
        descriptionId="onboarding-language-hint"
      />
      <p id="onboarding-language-hint" className="m-0 type-meta text-ink-muted">
        {t('onboarding.name.languageHint')}
      </p>
    </div>
  );
}

/**
 * The line saying where the country comes from, naming it when it is known.
 *
 * @param props.countryCode - the country on the profile, or null
 * @returns the heading and the line
 */
function CountryLine({ countryCode }: { countryCode: string | null }) {
  const { t, i18n } = useTranslation('account');
  // Step 1: name the country in the page's language ("Sweden", "Suedia"), or keep the general line.
  const line =
    countryCode === null
      ? t('onboarding.name.countryBody')
      : t('onboarding.name.countryDetected', { country: countryName(countryCode, i18n.language) });
  return (
    <div className="flex flex-col gap-1">
      <p className="m-0 type-meta font-semibold text-ink-muted">
        {t('onboarding.name.countryHeading')}
      </p>
      <p className="m-0 type-meta text-ink-muted">{line}</p>
    </div>
  );
}

/**
 * The language, country and county part, with "Next".
 *
 * @returns the fields and the button
 */
function LanguageAndRegion(props: {
  onboarding: MyOnboarding;
  state: ReturnType<typeof useMyOnboarding>;
  onNext: () => void;
}) {
  const { t } = useTranslation('account');
  const { regions } = useOnboardingChoices();
  const [regionCode, setRegionCode] = useState(props.onboarding.regionCode ?? '');
  // COUNTRY-2: only the counties of the country on the profile; a saved county of another
  // country shows as "I'd rather not say" and is cleared on Next.
  const countryRegions = regionsOfCountry(regions, props.onboarding.countryCode);
  const shownRegion = shownRegionCode(countryRegions, regionCode);

  /** Saves the county only when it changed, then moves on. */
  async function next() {
    const wanted = shownRegion === '' ? null : shownRegion;
    if (wanted !== props.onboarding.regionCode) {
      await props.state.save({ kind: 'region', regionCode: wanted });
    }
    props.onNext();
  }

  return (
    <div className="flex flex-col gap-4">
      <LanguageField />
      <CountryLine countryCode={props.onboarding.countryCode} />
      {countryRegions.length > 0 && (
        <RegionSelect
          id="onboarding-region"
          regions={countryRegions}
          value={shownRegion}
          onChange={setRegionCode}
        />
      )}
      {props.state.saveFailed && <Notice tone="error">{t('onboarding.saveFailed')}</Notice>}
      <Button
        className="self-start"
        disabled={props.state.isSaving}
        onClick={() => void next().catch(errorShownByHook)}
      >
        {props.state.isSaving ? t('onboarding.saving') : t('onboarding.next')}
      </Button>
    </div>
  );
}

/**
 * Renders the step's body: the names first when the account has no username.
 *
 * @param props.onboarding - the person's setup
 * @param props.state - useMyOnboarding's result
 * @param props.onNext - goes to step 2
 * @returns the body
 */
export function NameStep(props: {
  onboarding: MyOnboarding;
  state: ReturnType<typeof useMyOnboarding>;
  onNext: () => void;
}) {
  const account = useMyNames();
  if (!props.onboarding.hasHandle) {
    if (account.names === null) return null;
    // Saving the username reads the setup again; hasHandle then shows the rest of the step.
    return <SetupForm account={account} onDone={() => void props.state.refresh()} />;
  }
  return <LanguageAndRegion {...props} />;
}
