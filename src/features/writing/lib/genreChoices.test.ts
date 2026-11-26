/**
 * The Genres field's rules (story S1-E3-01).
 */
import { describe, expect, it } from 'vitest';

import type { Genre } from '../api/genres';

import { chosenGenreNames, findGenre, genreChoices, needsAdultRating } from './genreChoices';

const genres: Genre[] = [
  {
    slug: 'epic_fantasy',
    groupKey: 'fiction',
    names: { en: 'Epic fantasy', ro: 'Fantasy epic' },
    minimumRating: 'all_ages',
  },
  {
    slug: 'science_fiction',
    groupKey: 'fiction',
    names: { en: 'Science fiction', ro: 'Științifico-fantastic' },
    minimumRating: 'all_ages',
  },
  {
    slug: 'erotica',
    groupKey: 'fiction',
    names: { en: 'Erotica', ro: 'Literatură erotică' },
    minimumRating: '18_plus',
  },
];

describe('genreChoices', () => {
  it('offers the genres not chosen yet, named in the interface language', () => {
    expect(genreChoices(['epic_fantasy'], genres, 'ro')).toEqual([
      { slug: 'science_fiction', name: 'Științifico-fantastic' },
      { slug: 'erotica', name: 'Literatură erotică' },
    ]);
  });

  it('names a genre in English for an interface language without its own names', () => {
    expect(genreChoices([], genres, 'sv')[0]).toEqual({
      slug: 'epic_fantasy',
      name: 'Epic fantasy',
    });
  });
});

describe('findGenre', () => {
  const choices = genreChoices([], genres, 'ro');

  it('finds a genre by its name, however it is typed', () => {
    expect(findGenre('Științifico-fantastic', choices)).toBe('science_fiction');
    expect(findGenre('  stiintifico-FANTASTIC ', choices)).toBe('science_fiction');
  });

  it('finds nothing for a part of a name or an empty field', () => {
    expect(findGenre('fantasy', choices)).toBeNull();
    expect(findGenre('   ', choices)).toBeNull();
  });
});

describe('chosenGenreNames', () => {
  it('names the chosen genres in the order picked and leaves out one the list lacks', () => {
    expect(chosenGenreNames(['science_fiction', 'gone', 'epic_fantasy'], genres, 'en')).toEqual([
      'Science fiction',
      'Epic fantasy',
    ]);
  });
});

describe('needsAdultRating', () => {
  it('says an 18+ genre needs the 18+ rating', () => {
    expect(needsAdultRating(['erotica'], genres, '16_plus')).toBe(true);
    expect(needsAdultRating(['erotica'], genres, null)).toBe(true);
    expect(needsAdultRating(['erotica'], genres, '18_plus')).toBe(false);
  });

  it('asks nothing of the other genres', () => {
    expect(needsAdultRating(['epic_fantasy'], genres, 'all_ages')).toBe(false);
  });
});
