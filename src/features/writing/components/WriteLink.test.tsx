/**
 * Tests for WriteLink (S1-E3-01; bundle CALM-2): the quiet "Write" button in the top bar shows
 * that /write is the current page by its name and by a ring, not by nothing at all.
 */
import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { useSession } from '@/features/auth/hooks/useSession';
import { renderWithProviders } from '@/test/renderWithProviders';

import { WriteLink } from './WriteLink';

vi.mock('@/features/auth/hooks/useSession', () => ({ useSession: vi.fn() }));

/** Draws the button at an address, for a signed-in person. */
function renderAt(address: string) {
  vi.mocked(useSession).mockReturnValue({ userId: 'person-1' } as ReturnType<typeof useSession>);
  renderWithProviders(
    <MemoryRouter initialEntries={[address]}>
      <WriteLink />
    </MemoryRouter>,
    'en',
  );
  return screen.getByRole('link', { name: 'Write' });
}

describe('WriteLink', () => {
  it('marks itself as the current page on /write, with a ring people can see', () => {
    const link = renderAt('/write');
    expect(link).toHaveAttribute('aria-current', 'page');
    expect(link.className).toContain('aria-[current=page]:ring-2');
  });

  it('is a plain quiet button on any other page', () => {
    const link = renderAt('/discover');
    expect(link).not.toHaveAttribute('aria-current');
    expect(link).toHaveClass('button-glass');
  });
});
