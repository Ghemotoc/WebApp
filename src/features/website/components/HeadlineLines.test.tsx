/**
 * Unit tests for the home page headline's two lines (bundle LOGO-2).
 * Who runs it: `npm test` (Vitest).
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { HeadlineLines } from './HeadlineLines';

describe('HeadlineLines', () => {
  it('draws the first line in the heading colour and the second in the accent, with no underline', () => {
    const { container } = render(
      <h1>
        <HeadlineLines first="Write freely." second="Get read." />
      </h1>,
    );
    expect(screen.getByText('Write freely.')).toHaveClass('text-heading');
    expect(screen.getByText('Get read.')).toHaveClass('text-accent');
    // The gold underline was a decorative SVG; nothing draws one now.
    expect(container.querySelector('svg')).toBeNull();
    // The heading still reads as one sentence.
    expect(screen.getByRole('heading')).toHaveTextContent('Write freely. Get read.');
  });
});
