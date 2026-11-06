/**
 * NameStep: step 1, "Your name and language" (story S1-E2-06, criterion 1; board Onboarding 2.5).
 *
 * Who shows it: OnboardingPage. What it shows:
 * - the username and pen name (SetupForm) only for an account without a username, because the
 *   username is chosen at sign-up since 25 Oct 2026 (docs/board-fixes.md);
 * - the interface language, saved to the account at once (useInterfaceLanguage, S1-E1-04);
 * - a line saying the country comes from the connection (never asked, S1-E2-10);
 * - the optional county.
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
import { isSupportedLanguage } from '@/lib/i18n';

import type { MyOnboarding } from '../api/onboarding';
import type { useMyOnboarding } from '../hooks/useMyOnboarding';
import { useOnboardingChoices } from '../hooks/useOnboardingChoices';

import { RegionSelect } from './RegionSelect';
import { errorShownByHook } from '@/lib/errorShownByHook';

/** The two interface languages, each named in its own language (WCAG 3.1.2). */
const languageOptions = [
  { value: 'ro', label: 'Română', lang: 'ro' },
  { value: 'en', label: 'English', lang: 'en' },
];

/**
 * The interface language drop-down and its hint.
 *
 * @returns the field
 */
function LanguageField() {
  const { t } = useTranslation('account');
  const { language, changeLanguage } = useInterfaceLanguage();
  return (
    <div className="flex flex-col gap-1.5">
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
      <p id="onboarding-language-hint" className="m-0 text-[13px] text-meta">
        {t('onboarding.name.languageHint')}
      </p>
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

  /** Saves the county only when it changed, then moves on. */
  async function next() {
    const wanted = regionCode === '' ? null : regionCode;
    if (wanted !== props.onboarding.regionCode) {
      await props.state.save({ kind: 'region', regionCode: wanted });
    }
    props.onNext();
  }

  return (
    <div className="flex flex-col gap-5">
      <LanguageField />
      <div className="flex flex-col gap-1">
        <p className="m-0 text-[13px] font-semibold text-body">
          {t('onboarding.name.countryHeading')}
        </p>
        <p className="m-0 text-[13px] text-meta">{t('onboarding.name.countryBody')}</p>
      </div>
      <RegionSelect
        id="onboarding-region"
        regions={regions}
        value={regionCode}
        onChange={setRegionCode}
      />
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
