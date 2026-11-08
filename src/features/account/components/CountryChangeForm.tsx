/**
 * CountryChangeForm: choose the country you live in and save it (bundle MARKETS-1, stories
 * S1-E2-20 and S1-E2-22).
 *
 * Who uses it: CountrySetting (Settings › Account).
 * What it calls: useMyCountry → set_my_country(), which checks the new country's age rule before
 * anything is saved. What the person sees after "Save":
 * - saved, and the rules there need nothing more;
 * - saved, and a parent or guardian now has to agree: by which date, while they keep writing;
 * - not saved, because that country doesn't allow someone this young (nothing changed).
 * The fields are CountryFields, shared with sign-up.
 */
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { CountryFields } from '@/features/auth/components/CountryFields';
import { useAgeRules } from '@/features/auth/hooks/useAgeRules';

import { CountryChangeError, type CountryChangeResult } from '../api/myCountry';
import { useMyCountry } from '../hooks/useMyCountry';

/** What the form needs. */
interface CountryChangeFormProps {
  /** A prefix for the fields' ids, unique on the page. */
  idPrefix: string;
  /** The country and region to start from ('' when unknown). */
  startCountry: string;
  startRegion: string;
  /** Called once the change is saved; the parent may close the form. */
  onSaved?: (result: CountryChangeResult) => void;
  /** Shows a Cancel button that calls this. */
  onCancel?: () => void;
}

/**
 * A date in words in the reader's language, Romanian time.
 *
 * @param value - the moment
 * @param language - the reader's language
 * @returns "20 November 2026" or "20 noiembrie 2026"
 */
function dateInWords(value: string, language: string): string {
  return new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'ro', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Bucharest',
  }).format(new Date(value));
}

/**
 * The message after a save, or after a refusal.
 *
 * @returns the notice, or nothing before the first save
 */
function SaveMessage({ result, error }: { result?: CountryChangeResult; error: Error | null }) {
  const { t, i18n } = useTranslation('account');
  if (error !== null) {
    const failure = error instanceof CountryChangeError ? error.failure : 'unreachable';
    return <Notice tone="error">{t(`country.failures.${failure}`)}</Notice>;
  }
  if (result === undefined) return null;
  if (result.consentNeeded && result.graceUntil !== null) {
    return (
      <Notice tone="info">
        {t('country.consentNeeded', { date: dateInWords(result.graceUntil, i18n.language) })}
      </Notice>
    );
  }
  return <Notice tone="success">{t('country.saved')}</Notice>;
}

/**
 * Renders the fields, the Save button and the message.
 *
 * @returns the form
 */
export function CountryChangeForm({
  idPrefix,
  startCountry,
  startRegion,
  onSaved,
  onCancel,
}: CountryChangeFormProps) {
  const { t } = useTranslation('account');
  const ageRules = useAgeRules();
  const saving = useMyCountry();
  const [choice, setChoice] = useState({ country: startCountry, region: startRegion });
  const [problem, setProblem] = useState<string | undefined>(undefined);

  /** Checks a country is chosen, then saves it. */
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (choice.country === '') {
      setProblem('signUp.errors.countryMissing');
      return;
    }
    saving.mutate(choice, { onSuccess: (result) => onSaved?.(result) });
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      <CountryFields
        idPrefix={idPrefix}
        country={choice.country}
        region={choice.region}
        ageRules={ageRules.data ?? []}
        problem={problem}
        onChange={(country, region) => {
          setChoice({ country, region });
          setProblem(undefined);
        }}
      />
      <SaveMessage result={saving.data} error={saving.error} />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={saving.isPending}>
          {saving.isPending ? t('country.saving') : t('country.save')}
        </Button>
        {onCancel !== undefined && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            {t('country.cancel')}
          </Button>
        )}
      </div>
    </form>
  );
}
