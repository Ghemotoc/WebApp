/**
 * NudgeWordsSection: the kind-words nudge lists on Staff › Settings, one language at a time: find
 * a phrase, add one or remove one (bundle ADMIN-2, part d3; Robert, 2 Nov 2026, 22:10).
 *
 * A comment holding one of these words or phrases makes the comment box ask "Still want to send
 * this?" in the commenter's own browser. Nothing is blocked, stored or reported (rule 19), and the
 * intro says so. Like the username lists, the page shows at most 50 phrases at once.
 * Who shows it: SettingsPage. What it calls: useNudgeWords.
 */
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { TextInput } from '@/components/ui/TextInput';

import { useNudgeWords, type NudgeWordsState } from '../hooks/useNudgeWords';

import { SettingsFailureNotice } from './SettingsFailureNotice';
import { SettingsSection } from './SettingsSection';
import { errorShownByHook } from '@/lib/errorShownByHook';

/**
 * The form that adds a phrase to the chosen list.
 *
 * @returns the form
 */
function AddNudgeWord({ state, language }: { state: NudgeWordsState; language: string }) {
  const { t } = useTranslation('settings');
  const [phrase, setPhrase] = useState('');

  /** Adds the typed phrase and clears the field once it is saved. */
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (phrase.trim() === '') return;
    void state
      .change({ kind: 'add', language, phrase: phrase.trim() })
      .then(() => setPhrase(''))
      .catch(errorShownByHook);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3"
      aria-label={t('nudge.addLabel')}
    >
      <div className="min-w-0 flex-1 basis-[200px]">
        <TextInput
          id="nudge-word-new"
          label={t('nudge.addLabel')}
          maxLength={60}
          value={phrase}
          onChange={(event) => setPhrase(event.target.value)}
        />
      </div>
      <Button type="submit" disabled={state.isChanging || phrase.trim() === ''}>
        {t('words.add')}
      </Button>
    </form>
  );
}

/**
 * The phrases found, each a button that removes it.
 *
 * @returns the count line and the list
 */
function NudgeWordList({ state }: { state: NudgeWordsState }) {
  const { t } = useTranslation('settings');
  return (
    <>
      <p className="m-0 text-sm text-meta" aria-live="polite">
        {t('words.showing', { shown: state.words.length, total: state.total })}
      </p>
      {state.words.length === 0 && <p className="m-0 text-sm text-body">{t('nudge.empty')}</p>}
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label={t('nudge.listLabel')}>
        {state.words.map((word) => (
          <li key={word.id}>
            <Button
              variant="secondary"
              disabled={state.isChanging}
              aria-label={t('words.remove', { word: word.phrase })}
              onClick={() =>
                void state.change({ kind: 'remove', id: word.id }).catch(errorShownByHook)
              }
            >
              {word.phrase} ×
            </Button>
          </li>
        ))}
      </ul>
    </>
  );
}

/**
 * Renders the section.
 *
 * @returns the list picker, the search, the phrases and the add form
 */
export function NudgeWordsSection() {
  const { t } = useTranslation('settings');
  const [language, setLanguage] = useState('ro');
  const [search, setSearch] = useState('');
  const state = useNudgeWords(language, search);
  return (
    <SettingsSection id="nudge" heading={t('sections.nudge')} intro={t('nudge.intro')}>
      <SettingsFailureNotice failure={state.failure} />
      <div className="flex flex-wrap items-end gap-3">
        <Select
          id="nudge-words-language"
          label={t('words.language')}
          isLabelVisible
          value={language}
          onChange={setLanguage}
          options={['ro', 'en'].map((code) => ({
            value: code,
            label: t(`words.languages.${code}`),
            lang: code,
          }))}
        />
        <div className="min-w-0 flex-1 basis-[220px]">
          <TextInput
            id="nudge-words-search"
            type="search"
            label={t('nudge.search')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>
      <NudgeWordList state={state} />
      <AddNudgeWord state={state} language={language} />
    </SettingsSection>
  );
}
