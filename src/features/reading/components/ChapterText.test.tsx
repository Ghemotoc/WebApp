/**
 * ChapterText shows the allowed formatting and nothing that could run (story S1-E3-03; rule 8).
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ChapterText } from './ChapterText';

const pictureId = '0b9c2f4e-3a52-4c36-9b0e-2f7d1d0e5a11';

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

  it('draws a checked chapter picture with its alt text and a Report button (S1-E3-09)', () => {
    render(
      <ChapterText
        language="ro"
        markdown={`Text\n\n![Harta dealurilor](picture:${pictureId})`}
        pictures={{ [pictureId]: { state: 'visible', url: 'https://storage.test/signed' } }}
        canReportMedia
      />,
    );
    expect(screen.getByRole('img', { name: 'Harta dealurilor' })).toHaveAttribute(
      'src',
      'https://storage.test/signed',
    );
    expect(screen.getByRole('button', { name: 'actions.reportItem' })).toBeInTheDocument();
  });

  it('shows "Picture being checked" for a picture that isn\'t visible, and the marker for a removed one', () => {
    const { container } = render(
      <ChapterText
        language="ro"
        markdown={`![Unu](picture:${pictureId})\n\n![Doi](picture:1b9c2f4e-3a52-4c36-9b0e-2f7d1d0e5a11)`}
        pictures={{ [pictureId]: { state: 'removed', url: null } }}
      />,
    );
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('pictures.chapter.removed')).toBeInTheDocument();
    expect(screen.getByText('pictures.chapter.beingChecked')).toBeInTheDocument();
    expect(container.querySelector('p figure')).toBeNull();
  });
  it('puts the paragraph addon beside each top-level paragraph only, with its number (S1-E6-06)', () => {
    /** A stand-in for the comment marker, saying which paragraph it is beside. */
    function Marker({ block }: { block: number }) {
      return <button type="button">{`marker ${block}`}</button>;
    }
    const { container } = render(
      <ChapterText
        language="ro"
        markdown={'Primul.\n\n## Un titlu\n\nAl doilea.\n\n> Un citat'}
        paragraphAddon={Marker}
      />,
    );
    // The paragraphs are blocks 1 and 3; the heading and the quoted paragraph get no marker.
    const markers = screen.getAllByRole('button').map((button) => button.textContent);
    expect(markers).toEqual(['marker 1', 'marker 3']);
    // The block marks stay on the paragraph itself, where the share bar looks for them.
    expect(container.querySelector('.tmc-paragraph-row > p')).toHaveAttribute('data-block', '1');
  });

  it('draws paragraphs on their own without an addon', () => {
    const { container } = render(<ChapterText language="ro" markdown={'Primul.\n\nAl doilea.'} />);
    expect(container.querySelector('.tmc-paragraph-row')).toBeNull();
  });
});
