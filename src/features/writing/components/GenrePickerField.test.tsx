/**
 * Tests for GenrePickerField (story S1-E3-01): a genre typed in full is added, and the field waits
 * for the list of genres (fixed 28 Nov 2026, found by the S1-E12 epic check).
 */
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import type { Genre } from '../api/genres';
import { useGenres } from '../hooks/useGenres';

import { GenrePickerField } from './GenrePickerField';

vi.mock('../hooks/useGenres', () => ({ useGenres: vi.fn() }));

/** The one genre the tests pick. */
const erotica: Genre = {
  slug: 'erotica',
  groupKey: 'fiction',
  names: { en: 'Erotica', ro: 'Erotică' },
  minimumRating: '18_plus',
};

/** Makes useGenres answer with this list, as if it had loaded. */
function genresLoaded(genres: Genre[]) {
  vi.mocked(useGenres).mockReturnValue({ genres, isLoaded: genres.length > 0, loadFailed: false });
}

describe('GenrePickerField', () => {
  beforeEach(() => {
    genresLoaded([erotica]);
  });

  it('typing a genre in full adds it', () => {
    const onChange = vi.fn();
    renderWithProviders(<GenrePickerField genreSlugs={[]} onChange={onChange} rating="18_plus" />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Erotica' } });
    expect(onChange).toHaveBeenCalledWith(['erotica']);
  });

  it('the field waits while the list of genres is loading, so nothing typed is lost', () => {
    vi.mocked(useGenres).mockReturnValue({ genres: [], isLoaded: false, loadFailed: false });
    renderWithProviders(<GenrePickerField genreSlugs={[]} onChange={vi.fn()} rating="18_plus" />);
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('a list that failed to load leaves the field open', () => {
    vi.mocked(useGenres).mockReturnValue({ genres: [], isLoaded: false, loadFailed: true });
    renderWithProviders(<GenrePickerField genreSlugs={[]} onChange={vi.fn()} rating="18_plus" />);
    expect(screen.getByRole('combobox')).toBeEnabled();
  });
});
