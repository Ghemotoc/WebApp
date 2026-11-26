/**
 * Tests for the drawn cover (story S1-E3-01; bundle CALM-4, the three looks; DoD design rules,
 * covers).
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { coverDesigns, defaultChoiceFor, type DrawnCoverStyle } from './coverDesigns';
import { DrawnCover } from './DrawnCover';

const longTitle =
  'O poveste foarte lungă despre un oraș de munte și despre toți oamenii care au plecat din el';

const styles: DrawnCoverStyle[] = ['label', 'big_title', 'initial'];

describe('DrawnCover', () => {
  it('shows the full title as real text, never clipped, in every look', () => {
    for (const style of styles) {
      const { unmount } = render(
        <DrawnCover
          title={longTitle}
          choice={{ ...defaultChoiceFor('starry'), style }}
          size="card"
        />,
      );
      const title = screen.getByText(longTitle);
      // No ellipsis or line clamp anywhere on the way to the title.
      expect(title.className).not.toMatch(/truncate|line-clamp/);
      expect(title).toHaveClass('cover-words-title');
      unmount();
    }
  });

  it('keeps a title of short words at one size whatever its length, through --fit', () => {
    // Robert, DESIGN card, 26 Nov 2026, 21:07 UTC: titles no longer change size with length.
    const { container: short } = render(
      <DrawnCover title="Zori" choice={defaultChoiceFor('plum')} size="card" />,
    );
    const { container: longer } = render(
      <DrawnCover
        title="Ghemul de ață și pisica bunicii"
        choice={defaultChoiceFor('plum')}
        size="card"
      />,
    );
    const fitOf = (element: Element) =>
      (element.firstElementChild as HTMLElement).style.getPropertyValue('--fit');
    expect(fitOf(short)).toBe('1');
    expect(fitOf(longer)).toBe('1');
  });

  it('draws the label look by default, so covers saved before CALM-4 keep a label', () => {
    const { container } = render(
      <DrawnCover title="Titlu" choice={defaultChoiceFor('dots')} size="shelf" />,
    );
    expect(container.firstElementChild).toHaveAttribute('data-cover-style', 'label');
    expect(container.querySelector('.cover-label')).not.toBeNull();
  });

  it('draws the title font the writer picked, Literata when there is none', () => {
    const { container } = render(
      <DrawnCover
        title="Titlu"
        choice={{ ...defaultChoiceFor('ink'), titleFont: 'hand' }}
        size="card"
      />,
    );
    expect(container.firstElementChild).toHaveAttribute('data-title-font', 'hand');
  });

  it('on the initial look draws the first letter whole, marks included', () => {
    const { container } = render(
      <DrawnCover
        title="Șapte nopți"
        choice={{ ...defaultChoiceFor('violet'), style: 'initial' }}
        size="card"
      />,
    );
    expect(container.querySelector('.cover-glyph')).toHaveTextContent('Ș');
  });

  it('draws every design in every look and hides the artwork from screen readers', () => {
    for (const design of coverDesigns) {
      for (const style of styles) {
        const { container, unmount } = render(
          <DrawnCover
            title="Titlu"
            penName="lia.scrie"
            choice={{ ...defaultChoiceFor(design.key), style }}
            size="preview"
          />,
        );
        for (const svg of container.querySelectorAll('svg')) {
          expect(svg).toHaveAttribute('aria-hidden', 'true');
        }
        expect(screen.getByText('lia.scrie')).toBeInTheDocument();
        unmount();
      }
    }
  });

  it('can be hidden entirely when the title is repeated as text beside it', () => {
    const { container } = render(
      <DrawnCover title="Titlu" choice={defaultChoiceFor('sky')} size="shelf" isDecorative />,
    );
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });
});
