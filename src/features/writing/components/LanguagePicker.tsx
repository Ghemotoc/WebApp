/**
 * LanguagePicker: a searchable drop-down of languages, for the language a story is written in
 * (story S1-E3-01; Robert, 26 Nov 2026: "the writer can pick the language from an all language
 * list").
 *
 * With every language of the world in the list, a search field above the drop-down narrows it as
 * the writer types ("jap" leaves Japanese), by the name in the interface language, the language's
 * own name or its code. The drop-down stays a real <select> (the shared Select), so keyboards and
 * screen readers work as usual, and a short line says how many languages match, read out politely.
 * Who uses it: StoryBasicsSection (new story and story settings) and AddLanguageForm
 * (src/features/story-languages/). What it calls: languagesToList() in src/lib/language-names.ts.
 */
import type { TFunction } from 'i18next';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Select } from '@/components/ui/Select';
import { TextInput } from '@/components/ui/TextInput';
import { languagesToList, type LanguageChoice } from '@/lib/language-names';

/** What the picker needs. */
export interface LanguagePickerProps {
  /** The drop-down's id; the search field and the count line take ids made from it. */
  id: string;
  /** The drop-down's visible label, such as "Language of the story". */
  label: string;
  /** Every language to offer, named and sorted (useWorldLanguageChoices()). */
  choices: readonly LanguageChoice[];
  /** The chosen language's code, or '' for none yet. */
  value: string;
  onChange: (code: string) => void;
  /** When given, a first choice with this label and the value '' ("Choose a language"). */
  emptyLabel?: string;
  /** The id of a hint under the picker, read with the drop-down. */
  descriptionId?: string;
}

/**
 * Renders the search field, the count line and the drop-down.
 *
 * @returns the picker
 */
export function LanguagePicker(props: LanguagePickerProps) {
  const { id, label, choices, value, onChange, emptyLabel, descriptionId } = props;
  const { t } = useTranslation('writing');
  const [searchText, setSearchText] = useState('');
  // Step 1: the languages that match what was typed, the chosen one always kept.
  const { listed, matchCount } = languagesToList(choices, searchText, value);
  // Step 2: the drop-down's options, with the empty first choice when the form has one.
  const options = listed.map((choice) => ({ value: choice.code, label: choice.label }));
  if (emptyLabel !== undefined) options.unshift({ value: '', label: emptyLabel });
  // Step 3: the count line, only while something is typed.
  const countLine = matchCountLine(searchText, matchCount, t);
  return (
    <div className="flex flex-col gap-2">
      <TextInput
        id={`${id}-search`}
        type="search"
        label={t('newStory.languageSearch')}
        value={searchText}
        autoComplete="off"
        onChange={(event) => setSearchText(event.target.value)}
      />
      <p id={`${id}-matches`} aria-live="polite" className="m-0 type-meta">
        {countLine}
      </p>
      <Select
        id={id}
        label={label}
        isLabelVisible
        isLabelAbove
        placement="form"
        options={options}
        value={value}
        onChange={onChange}
        descriptionId={descriptionId}
      />
    </div>
  );
}

/**
 * The line under the search field: how many languages match, or that none does.
 *
 * @param searchText - what was typed
 * @param matchCount - how many languages match it
 * @param t - the writing namespace's translate function
 * @returns the line, or '' while nothing is typed
 */
function matchCountLine(searchText: string, matchCount: number, t: TFunction<'writing'>): string {
  if (searchText.trim() === '') return '';
  if (matchCount === 0) return t('newStory.languageNoMatch', { text: searchText.trim() });
  return t('newStory.languageMatches', { count: matchCount });
}
