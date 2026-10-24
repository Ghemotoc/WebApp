/**
 * Right-click and copy off on the chapter text (story S1-E4-06a; Q35).
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ProtectedChapterText } from './ProtectedChapterText';

/** Draws two paragraphs of protected text. */
function renderText() {
  render(<ProtectedChapterText markdown={'Primul paragraf.\n\nAl doilea.'} language="ro" />);
  return screen.getByText('Primul paragraf.');
}

describe('ProtectedChapterText', () => {
  it.each(['contextMenu', 'copy', 'cut', 'dragStart'] as const)(
    'turns off %s on the chapter text',
    (eventName) => {
      const paragraph = renderText();
      // fireEvent answers false when a listener cancelled the browser's default.
      expect(fireEvent[eventName](paragraph)).toBe(false);
    },
  );

  it('leaves the text as real, readable paragraphs: no user-select: none', () => {
    const paragraph = renderText();
    expect(paragraph.tagName).toBe('P');
    expect(paragraph.closest('[data-protected-text]')?.getAttribute('style') ?? '').not.toContain(
      'user-select',
    );
    expect(screen.getByText('Al doilea.')).toBeInTheDocument();
  });
});
