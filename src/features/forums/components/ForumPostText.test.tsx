/**
 * What a forum post's words may draw (bundle FORUMS-1, part b; S1-E8-02 criteria 1 and 2;
 * CLAUDE.md rule 8): the simple formatting, never raw HTML, and safe links only.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ForumPostText } from './ForumPostText';

describe('ForumPostText', () => {
  it('draws bold, italic, quotes and lists', () => {
    const { container } = render(
      <ForumPostText text={'**Bold** and *italic*\n\n> A quote\n\n1. First\n2. Second'} />,
    );
    expect(container.querySelector('strong')?.textContent).toBe('Bold');
    expect(container.querySelector('em')?.textContent).toBe('italic');
    expect(container.querySelector('blockquote')?.textContent).toContain('A quote');
    expect(container.querySelectorAll('ol li')).toHaveLength(2);
  });

  it('never runs a script, an iframe or a style, even if one got into the text', () => {
    const { container } = render(
      <ForumPostText
        text={
          'Hello <script>alert(1)</script><iframe src="https://x.example"></iframe><style>p{}</style>'
        }
      />,
    );
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.querySelector('style')).toBeNull();
  });

  it('gives a link rel="nofollow ugc noopener" and drops a script link', () => {
    render(
      <ForumPostText text={'[guide](https://example.com/guide) and [bad](javascript:alert(1))'} />,
    );
    const link = screen.getByRole('link', { name: 'guide' });
    expect(link.getAttribute('rel')).toBe('nofollow ugc noopener');
    expect(screen.queryByRole('link', { name: 'bad' })).toBeNull();
  });

  it('unwraps headings and pictures to their words', () => {
    const { container } = render(
      <ForumPostText text={'# Big\n\n![a cat](https://example.com/cat.png)'} />,
    );
    expect(container.querySelector('h1')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('Big');
  });
});
