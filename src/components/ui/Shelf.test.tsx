/**
 * Tests for shelves (story S1-E1-03; CLAUDE.md rule 20; DoD design rules, shelves and fades).
 * Scrolling itself needs a real browser; e2e/design-page.spec.ts checks the arrows there.
 */
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import { Shelf, type ShelfItem } from './Shelf';
import { chooseFadeSide } from './useShelfScroll';

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
    expect(screen.getByRole('link', { name: /View more\s*All 25 in Trending/ })).toHaveAttribute(
      'href',
      '/see-all',
    );
  });

  it("names the whole list's total when it is given, not just the stories it was handed", () => {
    renderWithProviders(
      <Shelf title="Trending" items={items(21)} totalCount={54} seeAllHref="/see-all" />,
      'en',
    );

    expect(
      screen.getByRole('link', { name: /View more\s*All 54 in Trending/ }),
    ).toBeInTheDocument();
  });

  it('has no "View more" card when 20 or fewer stories fit the limit', () => {
    renderWithProviders(<Shelf title="Classics" items={items(3)} seeAllHref="/see-all" />, 'en');

    expect(screen.queryByRole('link', { name: /View more/ })).toBeNull();
  });

  it('is one labelled, keyboard-focusable sideways region', () => {
    renderWithProviders(<Shelf title="Classics" items={items(3)} seeAllHref="/see-all" />, 'en');

    const row = screen.getByRole('region', { name: 'Classics, scrolls sideways' });
    expect(row).toHaveAttribute('tabindex', '0');
  });
});

describe('chooseFadeSide', () => {
  it('fades nothing when the row fits on screen', () => {
    expect(chooseFadeSide(false, true, true, 'forward')).toBe('none');
  });

  it('fades only the right edge at the start and only the left edge at the end', () => {
    expect(chooseFadeSide(true, true, false, 'back')).toBe('right');
    expect(chooseFadeSide(true, false, true, 'forward')).toBe('left');
  });

  it('fades the side the reader is moving towards in between', () => {
    expect(chooseFadeSide(true, false, false, 'forward')).toBe('right');
    expect(chooseFadeSide(true, false, false, 'back')).toBe('left');
  });
});
