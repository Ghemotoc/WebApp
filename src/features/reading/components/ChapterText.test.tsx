/**
 * ChapterText shows the allowed formatting and nothing that could run (story S1-E3-03; rule 8).
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ChapterText } from './ChapterText';

describe('ChapterText', () => {
  it('draws headings, bold, italic, quotes, lists and the scene break', () => {
    const { container } = render(
      <ChapterText
        language="ro"
        markdown={'## Marți\n\n**Bunica** *notează*.\n\n> Citat\n\n- unu\n\n* * *'}
      />,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Marți' })).toBeInTheDocument();
    expect(container.querySelector('strong')?.textContent).toBe('Bunica');
    expect(container.querySelector('em')?.textContent).toBe('notează');
    expect(container.querySelector('blockquote')).not.toBeNull();
    expect(container.querySelector('li')?.textContent).toBe('unu');
    expect(container.querySelector('hr')).not.toBeNull();
    expect(container.firstElementChild).toHaveAttribute('lang', 'ro');
  });

  it('gives links rel="nofollow ugc noopener" and drops javascript: links', () => {
    render(
      <ChapterText
        language="ro"
        markdown={'[aici](https://example.org) și [acolo](javascript:alert(1))'}
      />,
    );
    const link = screen.getByRole('link', { name: 'aici' });
    expect(link).toHaveAttribute('rel', 'nofollow ugc noopener');
    expect(link).toHaveAttribute('target', '_blank');
    expect(screen.queryByRole('link', { name: 'acolo' })).toBeNull();
    expect(screen.getByText(/acolo/)).toBeInTheDocument();
  });

  it('never renders raw HTML or pictures', () => {
    const { container } = render(
      <ChapterText
        language="ro"
        markdown={
          'Salut <script>alert(1)</script> <img src=x onerror=alert(2)> ![p](https://x/y.png)'
        }
      />,
    );
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });
});
