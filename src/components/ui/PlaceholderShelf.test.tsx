/**
 * Tests for the grey placeholders (design books item 15, "Loading that looks like the page").
 *
 * What it proves: nothing shows for the first 300 ms; then the row's heading, grey shapes hidden
 * from screen readers and a short "Loading…" line show; the comments' shapes do the same.
 */
import { act, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import { PlaceholderComments } from './PlaceholderComments';
import { PlaceholderShelf } from './PlaceholderShelf';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('the waiting row', () => {
  it('shows nothing in the first 300 ms, then the heading and the shapes', () => {
    const { container } = renderWithProviders(<PlaceholderShelf title="Trending" />, 'en');
    act(() => vi.advanceTimersByTime(299));
    expect(screen.queryByRole('heading', { name: 'Trending' })).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByRole('heading', { name: 'Trending' })).toBeInTheDocument();
    expect(screen.getByText('Loading the stories…')).toBeInTheDocument();
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    // The shapes are for the eyes only.
    expect(container.querySelectorAll('[aria-hidden="true"] li')).toHaveLength(6);
  });

  it('speaks Romanian too, with ș and ț', () => {
    renderWithProviders(<PlaceholderShelf title="În trend" />, 'ro');
    act(() => vi.advanceTimersByTime(300));
    expect(screen.getByText('Se încarcă poveștile…')).toBeInTheDocument();
  });
});

describe('the waiting comments', () => {
  it('shows three grey comments after 300 ms, with words for screen readers', () => {
    const { container } = renderWithProviders(
      <PlaceholderComments label="Loading the comments…" />,
      'en',
    );
    expect(screen.queryByText('Loading the comments…')).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(300));
    expect(screen.getByText('Loading the comments…')).toBeInTheDocument();
    expect(container.querySelectorAll('[aria-hidden="true"] li')).toHaveLength(3);
  });
});
