/**
 * The Canva trip pages as boards D10 and D11 draw them (BOOKS D10 and D11, user stories 5.10 and
 * 5.11): the breadcrumb, the heading that says what is happening, the state, the way back, and
 * "If something stops it" on the start page.
 */
import { screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import { CanvaStopRows } from './CanvaStopRows';
import { CanvaTripPage } from './CanvaTripPage';

describe('CanvaTripPage (boards D10 and D11)', () => {
  it('leads back to the story settings once the story is known', () => {
    renderWithProviders(
      <MemoryRouter>
        <CanvaTripPage
          heading="The cover is saved"
          line="Readers can see it now."
          state="Waiting for a check"
          backSlug="statia-meteo"
          isBackMain
        />
      </MemoryRouter>,
      'en',
    );
    const crumbs = screen.getByRole('navigation', { name: 'Where you are' });
    expect(within(crumbs).getByRole('link', { name: 'Story settings' })).toHaveAttribute(
      'href',
      '/write/s/statia-meteo/settings',
    );
    expect(within(crumbs).getByText('Cover')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'The cover is saved' })).toBeVisible();
    expect(screen.getByText('Waiting for a check')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to story settings' })).toHaveAttribute(
      'href',
      '/write/s/statia-meteo/settings',
    );
  });

  it('goes back to Writing while the story isn’t known yet', () => {
    renderWithProviders(
      <MemoryRouter>
        <CanvaTripPage heading="Opening Canva…" backSlug={null} />
      </MemoryRouter>,
      'en',
    );
    expect(screen.getByRole('link', { name: 'Back to Writing' })).toHaveAttribute('href', '/write');
  });
});

describe('CanvaStopRows (board D10)', () => {
  it('lists the two things that can stop the trip, with Try again on the first', () => {
    renderWithProviders(<CanvaStopRows />, 'en');
    const section = screen.getByRole('region', { name: 'If something stops it' });
    const rows = within(section).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    const [noAnswer, popUps] = rows as [HTMLElement, HTMLElement];
    expect(noAnswer).toHaveTextContent('Canva didn’t answer');
    expect(within(noAnswer).getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    // The site's address comes from the brand config, never from the copy.
    expect(popUps).toHaveTextContent(/Allow pop-ups for \S+\./);
  });
});
