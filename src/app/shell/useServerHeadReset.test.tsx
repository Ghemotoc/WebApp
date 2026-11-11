/**
 * Tests for useServerHeadReset (story S1-E11-37; bundle SEO-1b): the server's <title> for the
 * first page goes back to the site's name once the visitor moves on.
 */
import { act, render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';

import { useServerHeadReset } from './useServerHeadReset';

/** A screen that only runs the hook. */
function Screen() {
  useServerHeadReset();
  return null;
}

/** Puts a marked title into <head>, as server/website-head.ts writes it. */
function addServerTitle(): HTMLTitleElement {
  const title = document.createElement('title');
  title.textContent = 'Stories, poems and essays · Brand';
  title.dataset.pageHead = '';
  title.dataset.siteName = 'Brand';
  document.head.append(title);
  return title;
}

afterEach(() => {
  document.head.querySelectorAll('title').forEach((title) => title.remove());
});

describe('useServerHeadReset', () => {
  it('keeps the server’s title on the page it was written for, and puts the site’s name back on the next', async () => {
    const title = addServerTitle();
    const router = createMemoryRouter([{ path: '*', element: <Screen /> }], {
      initialEntries: ['/'],
    });
    render(<RouterProvider router={router} />);
    expect(title.textContent).toBe('Stories, poems and essays · Brand');
    await act(() => router.navigate('/discover'));
    expect(title.textContent).toBe('Brand');
    expect(title.hasAttribute('data-page-head')).toBe(false);
  });

  it('leaves a title the server didn’t mark alone', async () => {
    const title = document.createElement('title');
    title.textContent = 'Brand';
    document.head.append(title);
    const router = createMemoryRouter([{ path: '*', element: <Screen /> }], {
      initialEntries: ['/'],
    });
    render(<RouterProvider router={router} />);
    await act(() => router.navigate('/discover'));
    expect(title.textContent).toBe('Brand');
  });
});
