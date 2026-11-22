/**
 * The followers line's hidden table: the same numbers as the drawing, for screen readers
 * (bundle CALM-7b; design handover Step 4; S1-E3-07, criterion 2).
 */
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import { FollowersTable } from './FollowersTable';

describe('FollowersTable', () => {
  it('names its range and gives one row a week with the total and the new follows (Romanian, the default language)', () => {
    renderWithProviders(
      <FollowersTable
        range={90}
        step="week"
        points={[
          { startsOn: '2026-10-26', total: 126, gained: 9 },
          { startsOn: '2026-11-02', total: 147, gained: 21 },
        ]}
      />,
    );
    const table = screen.getByRole('table');
    expect(within(table).getByText(/ultimele 90 de zile/)).toBeInTheDocument();
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(within(rows[2] as HTMLElement).getByText('147')).toBeInTheDocument();
    expect(within(rows[2] as HTMLElement).getByText('21')).toBeInTheDocument();
  });

  it('says "fewer than 5" (in Romanian, the default) instead of a small number', () => {
    renderWithProviders(
      <FollowersTable
        range={7}
        step="day"
        points={[{ startsOn: '2026-11-22', total: null, gained: null }]}
      />,
    );
    expect(screen.getAllByText('mai puțin de 5')).toHaveLength(2);
  });
});
