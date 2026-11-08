/**
 * HeaderSearch: the search field in the website top bar (bundle G4 SHELL; handoff "Navigation":
 * "Website top bar: recessed track, water bubble on the current page, search, Write, bell, avatar";
 * canvas Discover.web board: a 44 px glass pill with a magnifying glass).
 *
 * It is a small search form: Enter opens the Search page with the words (/search?q=…), which runs
 * the search (S1-E5-04). The field has a label for screen readers and the role "search" names the
 * region. On a narrow screen the tab bar's round Search button takes its place.
 * Who uses it: TopBar. What it calls: React Router's navigate.
 */
import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { NavIcon } from '@/components/icons/NavIcon';

/**
 * Renders the search pill.
 *
 * @returns the search form
 */
export function HeaderSearch() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fieldId = useId();
  const [words, setWords] = useState('');

  /** Opens the Search page with the words typed (an empty field opens it ready to type). */
  function openSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = words.trim();
    void navigate(trimmed === '' ? '/search' : `/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form
      role="search"
      aria-label={t('shell.search')}
      onSubmit={openSearch}
      className="flex h-11 min-w-0 flex-[1_1_200px] items-center gap-2 rounded-full border border-control-border bg-(--field) px-4 text-meta focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-(--focus-ring)"
    >
      <NavIcon name="search" size={18} />
      <label htmlFor={fieldId} className="sr-only">
        {t('shell.searchLabel')}
      </label>
      <input
        id={fieldId}
        type="search"
        name="q"
        value={words}
        onChange={(event) => setWords(event.target.value)}
        placeholder={t('shell.searchLabel')}
        className="min-w-0 flex-1 border-0 bg-transparent font-body text-sm text-ink placeholder:text-meta focus:outline-none"
      />
    </form>
  );
}
