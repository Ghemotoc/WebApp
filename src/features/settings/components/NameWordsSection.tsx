/**
 * NameWordsSection: the username word lists, one language at a time: find a word, add one or
 * remove one (stories S1-E11-03 and S1-E2-04).
 *
 * The lists hold swearwords, so the page never shows a whole list at once: it shows the first 50
 * that match the search. Who shows it: SettingsPage. What it calls: useNameRules.
 */
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { TextInput } from '@/components/ui/TextInput';

import type { NameRulesState } from '../hooks/useNameRules';

import { SettingsSection } from './SettingsSection';

/** What the section needs: the shared hook's state and the chosen list and search. */
interface NameWordsSectionProps {
  state: NameRulesState;
  language: string;
  search: string;
  onLanguageChange: (language: string) => void;
  onSearchChange: (search: string) => void;
}

/**
 * The form that adds a word to the chosen list.
 *
 * @returns the form
 */
function AddNameWord({ state, language }: { state: NameRulesState; language: string }) {
  const { t } = useTranslation('settings');
  const [word, setWord] = useState('');

  /** Adds the typed word and clears the field once it is saved. */
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (word.trim() === '') return;
    void state
      .change({ kind: 'add_word', language, word: word.trim(), matchRule: 'anywhere' })
      .then(() => setWord(''))
      .catch(() => undefined);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3"
      aria-label={t('words.addLabel')}
    >
      <div className="min-w-0 flex-1 basis-[200px]">
        <TextInput
          id="name-word-new"
          label={t('words.addLabel')}
          value={word}
          onChange={(event) => setWord(event.target.value)}
        />
      </div>
      <Button type="submit" disabled={state.isChanging || word.trim() === ''}>
        {t('words.add')}
      </Button>
    </form>
  );
}

/**
 * Renders the section.
 *
 * @returns the list picker, the search, the words and the add form
 */
export function NameWordsSection(props: NameWordsSectionProps) {
  const { state, language, search } = props;
  const { t } = useTranslation('settings');
  return (
    <SettingsSection id="words" heading={t('sections.words')} intro={t('words.intro')}>
      <div className="flex flex-wrap items-end gap-3">
        <Select
          id="name-words-language"
          label={t('words.language')}
          isLabelVisible
          value={language}
          onChange={props.onLanguageChange}
          options={['ro', 'en'].map((code) => ({
            value: code,
            label: t(`words.languages.${code}`),
            lang: code,
          }))}
        />
        <div className="min-w-0 flex-1 basis-[220px]">
          <TextInput
            id="name-words-search"
            type="search"
            label={t('words.search')}
            value={search}
            onChange={(event) => props.onSearchChange(event.target.value)}
          />
        </div>
      </div>
      <p className="m-0 text-sm text-meta" aria-live="polite">
        {t('words.showing', { shown: state.words.length, total: state.wordTotal })}
      </p>
      {state.words.length === 0 && <p className="m-0 text-sm text-body">{t('words.empty')}</p>}
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label={t('words.listLabel')}>
        {state.words.map((word) => (
          <li key={word.id}>
            <Button
              variant="secondary"
              disabled={state.isChanging}
              aria-label={t('words.remove', { word: word.word })}
              onClick={() =>
                void state.change({ kind: 'remove_word', id: word.id }).catch(() => undefined)
              }
            >
              {word.word} ×
            </Button>
          </li>
        ))}
      </ul>
      <AddNameWord state={state} language={language} />
    </SettingsSection>
  );
}
