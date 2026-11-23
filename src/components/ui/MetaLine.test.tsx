/**
 * Tests for MetaLine (bundle CALM-2): facts read as words, a state is bold, empty facts are left out.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MetaLine } from './MetaLine';

describe('MetaLine', () => {
  it('shows each fact as its own list item, with no dots in the text', () => {
    render(<MetaLine facts={[{ text: 'Mystery' }, { text: '15 chapters' }, { text: '13+' }]} />);
    const items = screen.getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual(['Mystery', '15 chapters', '13+']);
  });

  it('draws a state in bold ink and a deadline in the warning colour', () => {
    render(
      <MetaLine
        facts={[
          { text: 'Due tomorrow', kind: 'deadline' },
          { text: 'Draft', kind: 'state' },
        ]}
      />,
    );
    expect(screen.getByText('Due tomorrow')).toHaveClass('text-(--warning-text)');
    expect(screen.getByText('Draft')).toHaveClass('font-semibold', 'text-ink');
  });

  it('leaves out empty facts and draws nothing when none are left', () => {
    const { container } = render(<MetaLine facts={[{ text: ' ' }]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
