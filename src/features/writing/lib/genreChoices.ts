/**
 * genreChoices: the small rules of the Genres field (story S1-E3-01; Robert, 26 Nov 2026: "They
 * can start from typing and then one pops up").
 *
 * Who calls it: components/GenrePickerField.tsx and the wizard's step summary
 * (hooks/useNewStorySteps.tsx). Pure functions, so they are unit-tested. The database checks the
 * list again (set_my_story_genres()); these only keep the screen tidy.
 */
import type { StoryRating } from '@/schemas/story';

import { genreName, type Genre } from '../api/genres';

/** One genre the writer can pick, with its name in the interface language. */
export interface GenreChoice {
  slug: string;
  name: string;
}

/**
 * Every genre not chosen yet, named in the interface language, in the list's own order (the
 * bookshop shelves: fiction first, then young adult, children, poetry, drama and nonfiction).
 *
 * @param chosen - the slugs already chosen
 * @param genres - every genre the writer may pick (useGenres())
 * @param language - the interface language
 * @returns the choices for the field's pop-up list
 */
export function genreChoices(
  chosen: readonly string[],
  genres: readonly Genre[],
  language: string,
): GenreChoice[] {
  return genres
    .filter((genre) => !chosen.includes(genre.slug))
    .map((genre) => ({ slug: genre.slug, name: genreName(genre, language) }));
}

/**
 * A name for comparing: lower case, without accents or diacritics ("Științifico-fantastic" →
 * "stiintifico-fantastic"), so a writer finds a genre however they type it.
 *
 * @param name - a genre name or what was typed
 * @returns the plain form
 */
function plainName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/**
 * The genre a writer picked from the pop-up list or typed in full: by its name, with any
 * capitals, accents or diacritics.
 *
 * @param typed - what is in the field
 * @param choices - the genres on offer (genreChoices())
 * @returns the slug, or null when the text names no genre on offer
 */
export function findGenre(typed: string, choices: readonly GenreChoice[]): string | null {
  const wanted = plainName(typed);
  if (wanted === '') return null;
  const match = choices.find((choice) => plainName(choice.name) === wanted);
  return match === undefined ? null : match.slug;
}

/**
 * The chosen genres' names, in the order picked; a slug the list doesn't hold (an 18+ genre the
 * person may not read) is left out.
 *
 * @param slugs - the chosen slugs
 * @param genres - every genre the writer may pick
 * @param language - the interface language
 * @returns the names
 */
export function chosenGenreNames(
  slugs: readonly string[],
  genres: readonly Genre[],
  language: string,
): string[] {
  const names: string[] = [];
  for (const slug of slugs) {
    const genre = genres.find((candidate) => candidate.slug === slug);
    if (genre !== undefined) names.push(genreName(genre, language));
  }
  return names;
}

/**
 * Whether a chosen genre needs the 18+ rating the story doesn't have yet (the erotic genres;
 * set_my_story_genres() refuses them on a younger story).
 *
 * @param slugs - the chosen slugs
 * @param genres - every genre the writer may pick
 * @param rating - the story's rating, or null before one is picked
 * @returns true when the field should say the story must be rated 18+
 */
export function needsAdultRating(
  slugs: readonly string[],
  genres: readonly Genre[],
  rating: StoryRating | null,
): boolean {
  if (rating === '18_plus') return false;
  return genres.some((genre) => slugs.includes(genre.slug) && genre.minimumRating === '18_plus');
}
