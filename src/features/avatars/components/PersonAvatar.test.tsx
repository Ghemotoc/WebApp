/**
 * Tests for PersonAvatar, the one small avatar beside a name (bundle LOOK-7; sizes and the plain
 * circle from bundle CALM-3).
 * The drawn avatar comes from AvatarImage, mocked here so no database is needed.
 */
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import { PersonAvatar } from './PersonAvatar';

// The drawn avatar: a marker naming the handle, so a test can see whether it was asked for.
vi.mock('./AvatarImage', () => ({
  AvatarImage: ({ handle }: { handle: string }) => <span data-testid={`drawn-${handle}`} />,
}));

describe('PersonAvatar', () => {
  it('shows the initials, hidden from screen readers, with the drawn avatar asked for on top', () => {
    const { container, getByTestId } = renderWithProviders(
      <PersonAvatar name="Lia Scrie" handle="adult_writer" />,
    );
    const avatar = container.firstElementChild;
    expect(avatar).toHaveAttribute('aria-hidden', 'true');
    expect(avatar).toHaveTextContent('LS');
    expect(getByTestId('drawn-adult_writer')).toBeInTheDocument();
  });

  it('keeps only the initials for a deleted account', () => {
    const { container, queryByTestId } = renderWithProviders(
      <PersonAvatar name="Deleted account" handle={null} />,
    );
    expect(container.firstElementChild).toHaveTextContent('DA');
    expect(queryByTestId(/^drawn-/)).toBeNull();
  });

  it('a comment uses the small 32 px size and a list the 36 px one', () => {
    const small = renderWithProviders(
      <PersonAvatar name="Lia" handle="adult_writer" size="small" />,
    );
    expect(small.container.firstElementChild?.className).toContain('size-8');
    const medium = renderWithProviders(<PersonAvatar name="Lia" handle="adult_writer" />);
    expect(medium.container.firstElementChild?.className).toContain('size-9');
  });

  it('draws the initials in Inter 600 on a plain circle', () => {
    const { container } = renderWithProviders(<PersonAvatar name="Lia" handle={null} />);
    const circle = container.querySelector('[data-avatar-bead]');
    expect(circle?.className).toContain('font-body');
    expect(circle?.className).toContain('font-semibold');
  });
});
