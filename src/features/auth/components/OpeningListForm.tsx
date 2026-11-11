/**
 * OpeningListForm: "Tell me when you open here" on the "not open in your country yet" page
 * (bundle G5, part a; story S1-E2-10; Robert, 7 Nov 2026, 11:57 UTC).
 *
 * Who uses it: NotOpenPage. What it calls: hooks/useOpeningListForm.ts, which sends the form to
 * POST /api/opening-list (api/openingList.ts).
 * The visitor gives an email address; the country is the connection's, found again on the server.
 * Only when the connection gave none does the form ask for the country. After sending, the form
 * gives way to "Check your email", whatever the server did, so it says nothing about who is on
 * the list. The hidden "website" field and the time the form was opened are the accessible bot
 * check (no puzzle, WCAG 2.2, 3.3.8).
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Select, type SelectOption } from '@/components/ui/Select';
import { TextInput } from '@/components/ui/TextInput';
import { countryName } from '@/features/safety/lib/countries';
import { countryCodes } from '@/lib/country-codes';

import type { JoinOutcome } from '../api/openingList';
import { useOpeningListForm } from '../hooks/useOpeningListForm';
import { writtenLanguageFor } from '@/schemas/interfaceLanguages';

/** What the form needs. */
interface OpeningListFormProps {
  /** The country of the connection, or null when it gave none (then the form asks). */
  country: string | null;
}

/**
 * Every country, named and sorted in the page's language, after "Choose a country".
 *
 * @returns the options
 */
function countryOptions(language: string, chooseLabel: string): SelectOption[] {
  const collator = new Intl.Collator(language);
  const named = countryCodes
    .map((code) => ({ value: code, label: countryName(code, language) }))
    .sort((first, second) => collator.compare(first.label, second.label));
  return [{ value: '', label: chooseLabel }, ...named];
}

/**
 * The hidden honeypot field: moved off screen, out of the tab order and hidden from screen
 * readers, so a person never fills it and a bot does.
 *
 * @returns the hidden field
 */
function HoneypotField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t } = useTranslation('auth');
  return (
    <div className="absolute -left-[10000px] h-px w-px overflow-hidden" aria-hidden="true">
      <label htmlFor="opening-list-website">{t('notOpen.website')}</label>
      <input
        id="opening-list-website"
        name="website"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

/**
 * Renders the form, or "Check your email" once it was sent.
 *
 * @returns the form
 */
export function OpeningListForm({ country }: OpeningListFormProps) {
  const { t, i18n } = useTranslation('auth');
  const form = useOpeningListForm(country, writtenLanguageFor(i18n.language));
  const { outcome } = form;

  if (outcome === 'listed') return <Notice tone="success">{t('notOpen.sent')}</Notice>;

  return (
    <form className="relative flex flex-col gap-4" noValidate onSubmit={form.handleSubmit}>
      <h2 className="m-0 font-heading text-xl font-semibold text-heading">
        {t('notOpen.formHeading')}
      </h2>
      <p className="m-0 text-body">{t('notOpen.formIntro')}</p>
      <TextInput
        id="opening-list-email"
        type="email"
        autoComplete="email"
        required
        label={t('notOpen.email')}
        value={form.email}
        errorMessage={outcome === 'invalid' ? t('notOpen.problems.invalid') : undefined}
        onChange={(event) => form.setEmail(event.target.value)}
      />
      {country === null && (
        <Select
          id="opening-list-country"
          label={t('notOpen.country')}
          isLabelVisible
          options={countryOptions(i18n.language, t('notOpen.chooseCountry'))}
          value={form.pickedCountry}
          onChange={form.setPickedCountry}
        />
      )}
      <HoneypotField value={form.website} onChange={form.setWebsite} />
      <OutcomeNotice outcome={outcome} />
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" variant="primary" isLoading={form.isSending}>
          {t('notOpen.submit')}
        </Button>
        <Link to="/legal/privacy" className="inline-flex min-h-11 items-center text-link underline">
          {t('notOpen.privacy')}
        </Link>
      </div>
    </form>
  );
}

/**
 * The line under the fields for anything but a bad address (which shows under the field itself).
 *
 * @returns the notice, or nothing
 */
function OutcomeNotice({ outcome }: { outcome: JoinOutcome | null }) {
  const { t } = useTranslation('auth');
  if (outcome === null || outcome === 'listed' || outcome === 'invalid') return null;
  if (outcome === 'already_open') {
    return (
      <Notice tone="info">
        {t('notOpen.problems.already_open')}{' '}
        <Link to="/sign-up" className="text-link underline">
          {t('notOpen.signUp')}
        </Link>
      </Notice>
    );
  }
  return (
    <p role="alert" className="m-0 text-sm text-destructive">
      {t(`notOpen.problems.${outcome}`)}
    </p>
  );
}
