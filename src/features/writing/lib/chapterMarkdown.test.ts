/**
 * The chapter converters: every allowed node survives a round trip, and nothing else gets in
 * (story S1-E3-02a; CLAUDE.md rule 8; ADR 0005).
 */
import { describe, expect, it } from 'vitest';

import {
  editorDocumentToMarkdown,
  escapeMarkdownText,
  isAllowedLink,
  markdownToEditorDocument,
  markdownToPlainText,
} from './chapterMarkdown';

/** Markdown → document → Markdown, which must give the same Markdown back. */
function roundTrip(markdown: string): string {
  return editorDocumentToMarkdown(markdownToEditorDocument(markdown));
}

describe('markdownToEditorDocument and editorDocumentToMarkdown', () => {
  it('keeps every allowed node through a round trip', () => {
    const markdown = [
      '## O zi la stația meteo',
      '',
      'Bunica **notează** vremea *în fiecare* dimineață, [de aici](https://example.org/x).',
      '',
      '### Marți',
      '',
      '> Un citat de două rânduri.',
      '',
      '- prima',
      '- a doua',
      '',
      '1. unu',
      '2. doi',
      '',
      '* * *',
      '',
      'Scrie la [adresa](mailto:hello@example.org).',
    ].join('\n');
    expect(roundTrip(markdown)).toBe(markdown);
  });

  it('gives one empty paragraph for an empty body, and nothing back for it', () => {
    expect(markdownToEditorDocument('')).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] });
    expect(editorDocumentToMarkdown({ type: 'doc', content: [{ type: 'paragraph' }] })).toBe('');
  });

  it('snaps headings to levels 2 and 3', () => {
    expect(roundTrip('# Titlu')).toBe('## Titlu');
    expect(roundTrip('#### Mic')).toBe('### Mic');
  });

  it('turns raw HTML, pictures and code into plain text, so no script survives', () => {
    const document = markdownToEditorDocument(
      'Salut <script>alert(1)</script> lume\n\n![alt](https://x/y.png)\n\n```\ncode\n```',
    );
    const markdown = editorDocumentToMarkdown(document);
    expect(markdown).not.toContain('<script>');
    expect(markdown).toContain('\\<script\\>');
    expect(markdown).not.toContain('![');
    expect(markdown).toContain('code');
  });

  it('drops javascript: and data: links but keeps their words', () => {
    expect(roundTrip('Click [aici](javascript:alert(1)) acum')).toBe('Click aici acum');
    expect(
      editorDocumentToMarkdown({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'x',
                marks: [{ type: 'link', attrs: { href: 'data:text/html,hi' } }],
              },
            ],
          },
        ],
      }),
    ).toBe('x');
  });

  it('escapes characters a writer types that Markdown would read as formatting', () => {
    expect(escapeMarkdownText('2 * 3 and a_b and [x]')).toBe('2 \\* 3 and a\\_b and \\[x\\]');
    expect(escapeMarkdownText('# not a heading')).toBe('\\# not a heading');
    expect(escapeMarkdownText('1. not a list')).toBe('1\\. not a list');
    // And it comes back as the same words.
    const document = markdownToEditorDocument(escapeMarkdownText('# not a heading'));
    expect(document.content?.[0]).toEqual({
      type: 'paragraph',
      content: [{ type: 'text', text: '# not a heading' }],
    });
  });

  it('keeps a hard line break inside a paragraph', () => {
    expect(roundTrip('rând unu  \nrând doi')).toBe('rând unu  \nrând doi');
  });
});

describe('chapter pictures in the converters (S1-E3-09)', () => {
  const pictureId = '0b9c2f4e-3a52-4c36-9b0e-2f7d1d0e5a11';

  it('keeps a picture on its own line through a round trip, its alt text escaped', () => {
    const markdown = `Bunica a desenat o hartă.\n\n![Harta \\[veche\\] a dealurilor](picture:${pictureId})\n\nSfârșit.`;
    const document = markdownToEditorDocument(markdown);
    expect(document.content?.[1]).toEqual({
      type: 'chapterPicture',
      attrs: { pictureId, alt: 'Harta [veche] a dealurilor' },
    });
    expect(editorDocumentToMarkdown(document)).toBe(markdown);
  });

  it('puts the alt text on one line and drops a picture without a real ID', () => {
    const markdown = editorDocumentToMarkdown({
      type: 'doc',
      content: [
        { type: 'chapterPicture', attrs: { pictureId, alt: 'Două\nrânduri' } },
        { type: 'chapterPicture', attrs: { pictureId: 'https://x/y.png', alt: 'Nu' } },
      ],
    });
    expect(markdown).toBe(`![Două rânduri](picture:${pictureId})`);
  });

  it('keeps a picture inside a sentence out of the editor, as before', () => {
    const markdown = editorDocumentToMarkdown(
      markdownToEditorDocument(`Text ![a](picture:${pictureId}) text`),
    );
    expect(markdown).not.toContain('picture:');
  });
});

describe('music and video cards in the converters (S1-E3-10)', () => {
  const embedId = '2c9c2f4e-3a52-4c36-9b0e-2f7d1d0e5a11';

  it('keeps a card on its own line through a round trip', () => {
    const markdown = `Ascultă asta.\n\n![Cum se face o prognoză](embed:${embedId})\n\nSfârșit.`;
    const document = markdownToEditorDocument(markdown);
    expect(document.content?.[1]).toEqual({
      type: 'chapterEmbed',
      attrs: { embedId, title: 'Cum se face o prognoză' },
    });
    expect(editorDocumentToMarkdown(document)).toBe(markdown);
  });

  it('drops a card without a real ID and leaves it out of the plain text', () => {
    const markdown = editorDocumentToMarkdown({
      type: 'doc',
      content: [{ type: 'chapterEmbed', attrs: { embedId: 'javascript:x', title: 'Nu' } }],
    });
    expect(markdown).toBe('');
    expect(markdownToPlainText(`Text\n\n![Titlu](embed:${embedId})`)).not.toContain('embed:');
  });
});

describe('isAllowedLink', () => {
  it('allows http, https and mailto only', () => {
    expect(isAllowedLink('https://example.org')).toBe(true);
    expect(isAllowedLink('http://example.org')).toBe(true);
    expect(isAllowedLink('mailto:a@b.ro')).toBe(true);
    expect(isAllowedLink('javascript:alert(1)')).toBe(false);
    expect(isAllowedLink('data:text/html,x')).toBe(false);
    expect(isAllowedLink('example.org')).toBe(false);
  });
});

describe('markdownToPlainText', () => {
  it('gives the words without the marks, paragraphs apart', () => {
    expect(markdownToPlainText('## Marți\n\n**Bunica** *notează*.\n\n- unu\n- doi\n\n* * *')).toBe(
      'Marți\n\nBunica notează.\n\nunu\n\ndoi\n\n* * *',
    );
  });
});
