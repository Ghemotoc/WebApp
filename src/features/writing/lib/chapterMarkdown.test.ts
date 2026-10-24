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
