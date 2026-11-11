/**
 * Tests for InitialsColourSection, the initials colour in Settings › Profile (bundle G11a).
 * The look and the save are mocked, so no database is needed.
 */
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import { InitialsColourSection } from './InitialsColourSection';

const save = vi.fn(() => Promise.resolve());
let savedColour: string | null = null;
let failure: string | null = null;

vi.mock('../hooks/useAvatarRecipe', () => ({
  useAvatarLook: () => ({
    data: { recipe: null, initialsColour: savedColour },
    isPending: false,
    isError: false,
  }),
  useSaveInitialsColour: () => ({
    save,
    reset: vi.fn(),
    isSaving: false,
    isSaved: false,
    failure,
  }),
}));

describe('InitialsColourSection', () => {
  beforeEach(() => {
    save.mockClear();
    savedColour = null;
    failure = null;
  });

  it('offers the sixteen colours as one radio group, starting on the saved one', () => {
    savedColour = 'sage';
    renderWithProviders(<InitialsColourSection handle="adult_writer" name="Lia Scrie" />, 'en');
    expect(screen.getByRole('group', { name: 'Colour for the initials' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(16);
    expect(screen.getByRole('radio', { name: 'Sage' })).toBeChecked();
  });

  it('saves the colour the person picks', () => {
    renderWithProviders(<InitialsColourSection handle="adult_writer" name="Lia Scrie" />, 'en');
    fireEvent.click(screen.getByRole('radio', { name: 'Cobalt' }));
    expect(screen.getByRole('radio', { name: 'Cobalt' })).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Save colour' }));
    expect(save).toHaveBeenCalledWith('cobalt');
  });

  it('says in words when the save was refused', () => {
    failure = 'not_allowed';
    renderWithProviders(<InitialsColourSection handle="adult_writer" name="Lia Scrie" />, 'en');
    expect(screen.getByRole('status')).toHaveTextContent('can’t change its profile right now');
  });
});
