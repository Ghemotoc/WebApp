/**
 * Tests for rows of covers (story S1-E1-03; CLAUDE.md rule 20; redrawn in CALM-4: no fades,
 * whole covers, "View 54" and arrows named for their row).
 * Scrolling itself needs a real browser; e2e/design-page.spec.ts checks the arrows there.
 */
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import { Shelf, type ShelfItem } from './Shelf';

/** Plain sample items. */
function items(count: number): ShelfItem[] {
  return Array.from({ length: count }, (_, index) => ({
    key: `item-${index}`,
    content: <span>Story {index + 1}</span>,
  }));
}

describe('Shelf', () => {
  it('shows at most 20 stories, then a "View more" link that names the total and the shelf', () => {
    renderWithProviders(<Shelf title="Trending" items={items(25)} seeAllHref="/see-all" />, 'en');

    expect(screen.getByText('Story 20')).toBeInTheDocument();
    expect(screen.queryByText('Story 21')).toBeNull();
    expect(screen.getByRole('link', { name: /View more\s*25 in Trending/ })).toHaveAttribute(
      'href',
      '/see-all',
    );
  });

  it("names the whole list's total when it is given, not just the stories it was handed", () => {
    renderWithProviders(
      <Shelf title="Trending" items={items(21)} totalCount={54} seeAllHref="/see-all" />,
      'en',
    );

    expect(screen.getByRole('link', { name: /View more\s*54 in Trending/ })).toBeInTheDocument();
  });

  it('has no "View more" card when 20 or fewer stories fit the limit', () => {
    renderWithProviders(<Shelf title="Classics" items={items(3)} seeAllHref="/see-all" />, 'en');

    expect(screen.queryByRole('link', { name: /View more/ })).toBeNull();
  });

  it('writes "View 54" beside the heading, named for its row', () => {
    renderWithProviders(
      <Shelf title="Trending" items={items(21)} totalCount={54} seeAllHref="/see-all" />,
      'en',
    );

    expect(screen.getByRole('link', { name: 'View 54 in Trending' })).toHaveAttribute(
      'href',
      '/see-all',
    );
  });

  it('puts every item in a list, so each cover is one list item', () => {
    renderWithProviders(<Shelf title="Classics" items={items(3)} />, 'en');

    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('has no fade: the row carries no mask', () => {
    renderWithProviders(<Shelf title="Classics" items={items(3)} />, 'en');

    const row = screen.getByRole('region', { name: 'Classics, scrolls sideways' });
    expect(row.style.maskImage).toBe('');
  });

  it('is one labelled, keyboard-focusable sideways region', () => {
    renderWithProviders(<Shelf title="Classics" items={items(3)} seeAllHref="/see-all" />, 'en');

    const row = screen.getByRole('region', { name: 'Classics, scrolls sideways' });
    expect(row).toHaveAttribute('tabindex', '0');
  });
});
