/**
 * Tests for the drawn cover (story S1-E3-01; DoD design rules, covers).
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MINIMUM_COVER_TITLE_SIZE } from '@/lib/cover-title';

import { coverDesigns, defaultChoiceFor } from './coverDesigns';
import { DrawnCover } from './DrawnCover';

const longTitle =
  'O poveste foarte lungă despre un oraș de munte și despre toți oamenii care au plecat din el';

describe('DrawnCover', () => {
  it('shows the full title as real text, never clipped, at every size', () => {
    for (const size of ['tile', 'preview', 'card', 'shelf'] as const) {
      const { unmount } = render(
        <DrawnCover title={longTitle} choice={defaultChoiceFor('starry')} size={size} />,
      );
      const title = screen.getByText(longTitle);
      // No ellipsis or line clamp anywhere on the way to the title.
      expect(title.className).not.toMatch(/truncate|line-clamp/);
      expect(title.style.fontSize).not.toBe('');
      expect(parseFloat(title.style.fontSize)).toBeGreaterThanOrEqual(MINIMUM_COVER_TITLE_SIZE);
      unmount();
    }
  });

  it('steps the title size down with its length', () => {
    render(<DrawnCover title="Zori" choice={defaultChoiceFor('plum')} size="card" />);
    render(<DrawnCover title={longTitle} choice={defaultChoiceFor('plum')} size="card" />);
    const short = parseFloat(screen.getByText('Zori').style.fontSize);
    const long = parseFloat(screen.getByText(longTitle).style.fontSize);
    expect(short).toBe(28);
    expect(long).toBeLessThan(short);
  });

  it('draws every design without an error and hides the artwork from screen readers', () => {
    for (const design of coverDesigns) {
      const { container, unmount } = render(
        <DrawnCover
          title="Titlu"
          penName="lia.scrie"
          choice={defaultChoiceFor(design.key)}
          size="preview"
        />,
      );
      for (const svg of container.querySelectorAll('svg')) {
        expect(svg).toHaveAttribute('aria-hidden', 'true');
      }
      expect(screen.getByText('lia.scrie')).toBeInTheDocument();
      unmount();
    }
  });

  it('can be hidden entirely when the title is repeated as text beside it', () => {
    const { container } = render(
      <DrawnCover title="Titlu" choice={defaultChoiceFor('sky')} size="shelf" isDecorative />,
    );
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });
});
