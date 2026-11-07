/**
 * The picture rule on every upload screen (bundle PICTURES-1; Robert, 7 Nov 2026): one line says
 * any picture is fine as long as it doesn't show a real person, and one "i" tooltip lists the
 * kinds from the picture_allowed_kinds setting. A file field reads both with aria-describedby.
 */
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePublicSettings } from '@/features/flags/hooks/usePublicSettings';
import { renderWithProviders } from '@/test/renderWithProviders';

import { pictureRulesIds } from '../lib/pictureRulesIds';

import { PictureRulesNote } from './PictureRulesNote';

vi.mock('@/features/flags/hooks/usePublicSettings', () => ({ usePublicSettings: vi.fn() }));

/** The setting as it is after the PICTURES-1 migration. */
const allowedKinds = [
  'drawing',
  'illustration',
  'photo_of_places_and_things',
  'non_photographic_ai',
];

describe('the picture rule note', () => {
  beforeEach(() => {
    vi.mocked(usePublicSettings).mockReturnValue({
      wordsOf: () => allowedKinds,
    } as unknown as ReturnType<typeof usePublicSettings>);
  });

  it('says any picture is fine as long as it doesn’t show a real person', () => {
    renderWithProviders(<PictureRulesNote id="rules" />, 'en');
    expect(
      screen.getByText('Any picture, as long as it doesn’t show a real person.'),
    ).toBeVisible();
  });

  it('lists every allowed kind in its one tooltip, with no comma before “and”', () => {
    renderWithProviders(<PictureRulesNote id="rules" />, 'en');
    fireEvent.focus(screen.getByRole('button', { name: 'Which pictures are allowed' }));
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      'Allowed: drawings and drawn characters, illustrations and vectors, photos of places and things and AI pictures that don’t look like a real person. Never a real person or a celebrity.',
    );
  });

  it('gives a file field the line and the full list as its description', () => {
    renderWithProviders(
      <>
        <input type="file" aria-label="Cover" aria-describedby={pictureRulesIds('rules')} />
        <PictureRulesNote id="rules" />
      </>,
      'en',
    );
    expect(screen.getByLabelText('Cover')).toHaveAccessibleDescription(
      /^Any picture, as long as it doesn’t show a real person\. Allowed: .*Never a real person or a celebrity\.$/,
    );
  });

  it('says the same in Romanian, with ș and ț', () => {
    renderWithProviders(<PictureRulesNote id="rules" />);
    expect(screen.getByText('Orice imagine, cât timp nu arată o persoană reală.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Ce imagini sunt permise' })).toBeVisible();
  });
});
