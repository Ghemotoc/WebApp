/**
 * SetInCountriesField: "Set in", the countries a story takes place in (CALM-9, board D02, step 2
 * "Format, tags and setting", next to Format; the field was Category before FORMS-1).
 *
 * Board values: up to five countries as chips, each with a pin icon and a remove button, plus a
 * search field. Picking a country from the field's list (or typing its name and pressing Enter)
 * adds it; at five the field closes with a line saying to remove one first. "Set in Romania" is
 * no longer a tag: it lives in stories.set_in_countries, saved by set_my_story_set_in_countries().
 * Who uses it: CategoryTagsSection (the new story wizard and story settings).
 * What it calls: lib/setInCountries.ts for the country list and the name matching.
 */
import { useId, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { CrossIcon } from '@/components/icons/CrossIcon';
import { SearchInput } from '@/components/ui/SearchInput';
import { withCountry, withoutCountry } from '@/features/country-block/lib/hiddenCountries';
import { countryName } from '@/features/discovery/lib/countryNames';
import { MAXIMUM_SET_IN_COUNTRIES } from '@/schemas/story';

import { findSetInCountry, setInChoices, type SetInChoice } from '../lib/setInCountries';

/** What the field needs. */
export interface SetInCountriesFieldProps {
  /** The two-letter codes chosen so far. */
  countries: readonly string[];
  /** Called with the whole new list after each change. */
  onChange: (countries: string[]) => void;
  /** A translated mistake from the form's check, when there is one. */
  errorMessage?: string;
}

/** One chosen country: the pin, the name and a remove button. */
function SetInChip({ code, onRemove }: { code: string; onRemove: () => void }) {
  const { t, i18n } = useTranslation('writing');
  const name = countryName(code, i18n.language);
  return (
    <li className="inline-flex h-10 items-center gap-2 rounded-full border border-(--pill-plum-border) bg-(--pill-plum-bg) pl-3 type-body leading-none font-semibold text-(--pill-plum-text)">
      <ActionIcon name="pin" size={14} />
      {name}
      <button
        type="button"
        aria-label={t('setIn.remove', { country: name })}
        onClick={onRemove}
        className="inline-flex size-9 items-center justify-center rounded-full hover:bg-tint"
      >
        <CrossIcon />
      </button>
    </li>
  );
}

/**
 * How typing turns into countries: picking a name from the field's list, or typing one and
 * pressing Enter, adds it and clears the field.
 *
 * @returns the typed text and the field's two handlers
 */
function useSetInTyping({
  countries,
  onChange,
  choices,
  isFull,
}: {
  countries: readonly string[];
  onChange: (countries: string[]) => void;
  choices: SetInChoice[];
  isFull: boolean;
}) {
  const [typed, setTyped] = useState('');

  /** Adds the country the text names, if any, and clears the field. */
  function addFrom(text: string): boolean {
    const code = findSetInCountry(text, choices);
    if (code === null || isFull) return false;
    onChange(withCountry(countries, code));
    setTyped('');
    return true;
  }

  /** Picking a name from the list fills the field with it exactly, so it is added at once. */
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const text = event.target.value;
    if (!addFrom(text)) setTyped(text);
  }

  /** Enter adds the typed country and never sends the form (that would move the wizard on). */
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    addFrom(typed);
  }

  return { typed, handleChange, handleKeyDown };
}

/**
 * Renders the label, the chips, the search field and the hint.
 *
 * @returns the field
 */
export function SetInCountriesField({
  countries,
  onChange,
  errorMessage,
}: SetInCountriesFieldProps) {
  const { t, i18n } = useTranslation('writing');
  const fieldId = useId();
  const listId = useId();
  const choices = setInChoices(countries, i18n.language);
  const isFull = countries.length >= MAXIMUM_SET_IN_COUNTRIES;
  const typing = useSetInTyping({ countries, onChange, choices, isFull });

  const hint = isFull
    ? t('setIn.full', { max: MAXIMUM_SET_IN_COUNTRIES })
    : t('setIn.hint', { count: countries.length, max: MAXIMUM_SET_IN_COUNTRIES });
  return (
    <div className="flex flex-col gap-3">
      {/* The visible label; SearchInput carries the same words as the field's own label. */}
      <span aria-hidden="true" className="type-body font-semibold text-ink">
        {t('setIn.label')}
      </span>
      {countries.length > 0 && (
        <ul aria-label={t('setIn.groupLabel')} className="m-0 flex list-none flex-wrap gap-2 p-0">
          {countries.map((code) => (
            <SetInChip
              key={code}
              code={code}
              onRemove={() => onChange(withoutCountry(countries, code))}
            />
          ))}
        </ul>
      )}
      <SearchInput
        id={fieldId}
        label={t('setIn.label')}
        placeholder={t('setIn.search')}
        list={listId}
        value={typing.typed}
        disabled={isFull}
        autoComplete="off"
        aria-describedby={`${fieldId}-hint`}
        aria-invalid={errorMessage === undefined ? undefined : true}
        onChange={typing.handleChange}
        onKeyDown={typing.handleKeyDown}
      />
      <datalist id={listId}>
        {choices.map((choice) => (
          <option key={choice.code} value={choice.name} />
        ))}
      </datalist>
      <p id={`${fieldId}-hint`} className="m-0 type-meta text-ink-muted">
        {hint}
      </p>
      {errorMessage !== undefined && (
        <p role="alert" className="m-0 type-meta font-semibold text-destructive">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
