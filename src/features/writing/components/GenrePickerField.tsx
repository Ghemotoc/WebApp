/**
 * GenrePickerField: "Genres", the bookshop genres a story belongs to (story S1-E3-01; Robert, 26
 * Nov 2026, 20:34 UTC: "They can start from typing and then one pops up").
 *
 * Built like "Set in" (SetInCountriesField, CALM-9): up to three genres as chips, each with a
 * remove button, and a search field whose pop-up list shows the genres that match what is typed.
 * Picking one from the list (or typing its full name and pressing Enter) adds it; at three the
 * field closes with a line saying to remove one first. An 18+ genre (erotica) is offered only to
 * adults (the database's genres_select_public), and the field says when the story must be rated
 * 18+ to keep it (set_my_story_genres() refuses it on a younger story).
 * Who uses it: CategoryTagsSection (the new story wizard and story settings).
 * What it calls: hooks/useGenres.ts for the list and lib/genreChoices.ts for the matching.
 */
import { useId, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { CrossIcon } from '@/components/icons/CrossIcon';
import { SearchInput } from '@/components/ui/SearchInput';
import { MAXIMUM_GENRES, type StoryRating } from '@/schemas/story';

import type { Genre } from '../api/genres';
import { useGenres } from '../hooks/useGenres';
import {
  chosenGenreNames,
  findGenre,
  genreChoices,
  needsAdultRating,
  type GenreChoice,
} from '../lib/genreChoices';

/** What the field needs. */
export interface GenrePickerFieldProps {
  /** The genre slugs chosen so far, in the order picked. */
  genreSlugs: readonly string[];
  /** Called with the whole new list after each change. */
  onChange: (genreSlugs: string[]) => void;
  /** The story's rating so far, so the field can say when an 18+ genre needs it. */
  rating: StoryRating | null;
  /** A translated mistake from the form's check, when there is one. */
  errorMessage?: string;
}

/** One chosen genre: its name and a remove button. */
function GenreChip({ name, onRemove }: { name: string; onRemove: () => void }) {
  const { t } = useTranslation('writing');
  return (
    <li className="inline-flex h-10 items-center gap-2 rounded-full border border-(--pill-plum-border) bg-(--pill-plum-bg) pl-3 type-body leading-none font-semibold text-(--pill-plum-text)">
      {name}
      <button
        type="button"
        aria-label={t('genres.remove', { genre: name })}
        onClick={onRemove}
        className="inline-flex size-9 items-center justify-center rounded-full hover:bg-tint"
      >
        <CrossIcon />
      </button>
    </li>
  );
}

/**
 * The chosen genres as chips, in the order picked; nothing while none is chosen.
 *
 * @returns the list of chips, or null
 */
function ChosenGenres({
  genreSlugs,
  genres,
  onChange,
}: {
  genreSlugs: readonly string[];
  genres: readonly Genre[];
  onChange: (genreSlugs: string[]) => void;
}) {
  const { t, i18n } = useTranslation('writing');
  if (genreSlugs.length === 0) return null;
  return (
    <ul aria-label={t('genres.groupLabel')} className="m-0 flex list-none flex-wrap gap-2 p-0">
      {genreSlugs.map((slug) => (
        <GenreChip
          key={slug}
          name={chosenGenreNames([slug], genres, i18n.language)[0] ?? slug}
          onRemove={() => onChange(genreSlugs.filter((chosen) => chosen !== slug))}
        />
      ))}
    </ul>
  );
}

/**
 * How typing turns into genres: picking a name from the pop-up list, or typing one in full and
 * pressing Enter, adds it and clears the field.
 *
 * @returns the typed text and the field's two handlers
 */
function useGenreTyping({
  genreSlugs,
  onChange,
  choices,
  isFull,
}: {
  genreSlugs: readonly string[];
  onChange: (genreSlugs: string[]) => void;
  choices: GenreChoice[];
  isFull: boolean;
}) {
  const [typed, setTyped] = useState('');

  /** Adds the genre the text names, if any, and clears the field. */
  function addFrom(text: string): boolean {
    const slug = findGenre(text, choices);
    if (slug === null || isFull) return false;
    onChange([...genreSlugs, slug]);
    setTyped('');
    return true;
  }

  /** Picking a name from the list fills the field with it exactly, so it is added at once. */
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const text = event.target.value;
    if (!addFrom(text)) setTyped(text);
  }

  /** Enter adds the typed genre and never sends the form (that would move the wizard on). */
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    addFrom(typed);
  }

  return { typed, handleChange, handleKeyDown };
}

/** The line under the field: how many are left, or that the field is full. */
function useGenreHint(count: number): string {
  const { t } = useTranslation('writing');
  if (count >= MAXIMUM_GENRES) return t('genres.full', { max: MAXIMUM_GENRES });
  return t('genres.hint', { count, max: MAXIMUM_GENRES });
}

/**
 * Renders the label, the chips, the search field with its pop-up list and the hints.
 *
 * @returns the field
 */
export function GenrePickerField({
  genreSlugs,
  onChange,
  rating,
  errorMessage,
}: GenrePickerFieldProps) {
  const { t, i18n } = useTranslation('writing');
  const fieldId = useId();
  const listId = useId();
  const { genres } = useGenres();
  const choices = genreChoices(genreSlugs, genres, i18n.language);
  const isFull = genreSlugs.length >= MAXIMUM_GENRES;
  const typing = useGenreTyping({ genreSlugs, onChange, choices, isFull });
  const hint = useGenreHint(genreSlugs.length);
  return (
    <div className="flex flex-col gap-3">
      {/* The visible label; SearchInput carries the same words as the field's own label. */}
      <span aria-hidden="true" className="type-body font-semibold text-ink">
        {t('genres.label')}
      </span>
      <ChosenGenres genreSlugs={genreSlugs} genres={genres} onChange={onChange} />
      <SearchInput
        id={fieldId}
        label={t('genres.label')}
        placeholder={t('genres.search')}
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
          <option key={choice.slug} value={choice.name} />
        ))}
      </datalist>
      <p id={`${fieldId}-hint`} className="m-0 type-meta text-ink-muted">
        {hint}
      </p>
      {needsAdultRating(genreSlugs, genres, rating) && (
        <p className="m-0 type-meta font-semibold text-ink">{t('genres.needsAdultRating')}</p>
      )}
      {errorMessage !== undefined && (
        <p role="alert" className="m-0 type-meta font-semibold text-destructive">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
