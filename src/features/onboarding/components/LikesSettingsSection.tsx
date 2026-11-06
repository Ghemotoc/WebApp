/**
 * LikesSettingsSection: "What you like" in Settings: the county and the likes (story S1-E2-06;
 * board Settings 6.3). "Let adults message me" moved to Settings › Messages with the other
 * message settings (MessageSettingsSection, S1-E9-04).
 *
 * Why: setup says every step can be skipped and changed later in Settings, so the same choices
 * live here (criteria 2 and 3).
 * Who shows it: SettingsPage, once the person has a username. What it calls: useMyOnboarding
 * (my_onboarding() and the writes) and useOnboardingChoices (the counties).
 * "Save" stores the county and the likes together.
 */
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import type { MyOnboarding, Preferences } from '../api/onboarding';
import { useMyOnboarding } from '../hooks/useMyOnboarding';
import { useOnboardingChoices } from '../hooks/useOnboardingChoices';

import { LikesFields } from './LikesFields';
import { RegionSelect } from './RegionSelect';
import { errorShownByHook } from '@/lib/errorShownByHook';

/** What the form needs. */
interface LikesFormProps {
  onboarding: MyOnboarding;
  state: ReturnType<typeof useMyOnboarding>;
}

/**
 * The county and likes form, started from what is saved.
 *
 * @returns the form
 */
function LikesForm({ onboarding, state }: LikesFormProps) {
  const { t } = useTranslation('account');
  const { regions } = useOnboardingChoices();
  const [regionCode, setRegionCode] = useState(onboarding.regionCode ?? '');
  const [preferences, setPreferences] = useState<Preferences>({
    readCategories: onboarding.readCategories,
    writeCategories: onboarding.writeCategories,
    topicTagIds: onboarding.topicTagIds,
  });
  const [isSaved, setIsSaved] = useState(false);

  /** Saves the county, then the likes; "Saved." shows once both worked. */
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSaved(false);
    await state.save({ kind: 'region', regionCode: regionCode === '' ? null : regionCode });
    await state.save({ kind: 'preferences', preferences });
    setIsSaved(true);
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => void handleSubmit(event).catch(errorShownByHook)}
    >
      <RegionSelect
        id="settings-region"
        regions={regions}
        value={regionCode}
        onChange={setRegionCode}
      />
      <LikesFields value={preferences} onChange={setPreferences} />
      {state.saveFailed && <Notice tone="error">{t('onboarding.saveFailed')}</Notice>}
      {isSaved && !state.saveFailed && (
        <Notice tone="success">{t('onboarding.settings.saved')}</Notice>
      )}
      <Button type="submit" variant="secondary" className="self-start" disabled={state.isSaving}>
        {state.isSaving ? t('onboarding.saving') : t('onboarding.settings.save')}
      </Button>
    </form>
  );
}

/**
 * Renders the section.
 *
 * @returns the section, once the person's setup has loaded
 */
export function LikesSettingsSection() {
  const { t } = useTranslation('account');
  const state = useMyOnboarding();
  const { onboarding } = state;
  return (
    <section
      aria-labelledby="settings-likes-heading"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-card"
    >
      <h2
        id="settings-likes-heading"
        className="m-0 font-heading text-[22px] font-bold text-heading"
      >
        {t('onboarding.settings.heading')}
      </h2>
      <p className="m-0 text-body">{t('onboarding.settings.intro')}</p>
      {state.loadFailed && <Notice tone="error">{t('onboarding.loadFailed')}</Notice>}
      {onboarding != null && <LikesForm onboarding={onboarding} state={state} />}
    </section>
  );
}
