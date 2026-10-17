/**
 * Tests for interactive chips (story S1-E1-03; DoD pill system).
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Chip } from './Chip';

describe('Chip', () => {
  it('shows its selected state with aria-pressed and a tick, not colour alone', () => {
    const { container } = render(
      <Chip isPressed onPressedChange={() => undefined}>
        Poetry
      </Chip>,
    );

    expect(screen.getByRole('button', { name: 'Poetry' })).toHaveAttribute('aria-pressed', 'true');
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('has no tick when it is not selected', () => {
    const { container } = render(
      <Chip isPressed={false} onPressedChange={() => undefined}>
        Poetry
      </Chip>,
    );

    expect(screen.getByRole('button', { name: 'Poetry' })).toHaveAttribute('aria-pressed', 'false');
    expect(container.querySelector('svg')).toBeNull();
  });

  it('asks its parent to switch it on when pressed', () => {
    const handlePressedChange = vi.fn();
    render(
      <Chip isPressed={false} onPressedChange={handlePressedChange}>
        Poetry
      </Chip>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Poetry' }));

    expect(handlePressedChange).toHaveBeenCalledWith(true);
  });
});
