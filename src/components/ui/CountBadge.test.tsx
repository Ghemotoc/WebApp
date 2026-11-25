/**
 * Tests for CountBadge (design books item 16; Robert's pick "Small number, 9+ cap", 24 Nov 2026).
 */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CountBadge } from './CountBadge';
import { formatBadgeCount } from './countBadgeText';

describe('formatBadgeCount', () => {
  it('shows nothing when nothing is new', () => {
    expect(formatBadgeCount(0)).toBe('');
    expect(formatBadgeCount(-3)).toBe('');
    expect(formatBadgeCount(Number.NaN)).toBe('');
  });

  it('spells out 1 to 9', () => {
    expect(formatBadgeCount(1)).toBe('1');
    expect(formatBadgeCount(9)).toBe('9');
  });

  it('caps anything above 9 at 9+', () => {
    expect(formatBadgeCount(10)).toBe('9+');
    expect(formatBadgeCount(250)).toBe('9+');
  });
});

describe('CountBadge', () => {
  it('draws nothing for a count of 0', () => {
    const { container } = render(<CountBadge count={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('is hidden from screen readers, because the link says the full count', () => {
    const { container } = render(<CountBadge count={12} />);
    const badge = container.querySelector('[data-count-badge]');
    expect(badge).toHaveTextContent('9+');
    expect(badge).toHaveAttribute('aria-hidden', 'true');
  });
});
