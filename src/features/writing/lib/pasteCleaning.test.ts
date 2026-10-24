/**
 * Pasted Word, Google Docs and hostile HTML is reduced to the allowed formatting
 * (story S1-E3-02b; CLAUDE.md rule 8). The fixtures are modelled on what each program puts on
 * the clipboard. The second half runs the cleaned HTML through the real editor schema and the
 * Markdown converter, so the test proves the whole way to what is stored.
 */
import { Editor } from '@tiptap/core';
import { describe, expect, it } from 'vitest';

import googleDocsHtml from '@/test/fixtures/paste/google-docs.html?raw';
import maliciousHtml from '@/test/fixtures/paste/malicious.html?raw';
import wordHtml from '@/test/fixtures/paste/word.html?raw';

import { editorDocumentToMarkdown, type EditorNode } from './chapterMarkdown';
import { chapterEditorExtensions } from './editorExtensions';
import { cleanPastedHtml } from './pasteCleaning';

/** Parses HTML the way a paste does (through the editor's schema) and gives the stored Markdown. */
function markdownAfterPaste(html: string): string {
  const editor = new Editor({
    extensions: chapterEditorExtensions({ openLinkDialog: () => undefined }),
    content: cleanPastedHtml(html),
  });
  const markdown = editorDocumentToMarkdown(editor.getJSON() as EditorNode);
  editor.destroy();
  return markdown;
}

describe('cleanPastedHtml', () => {
  it('turns a Word paste into headings, bold, italic, a list and a link', () => {
    const markdown = markdownAfterPaste(wordHtml);
    expect(markdown).toBe(
      [
        '## Stația meteo',
        '',
        '**Bunica** notează vremea *în fiecare* dimineață.',
        '',
        '- Temperatura',
        '- Vântul',
        '',
        'Un citat din caiet.',
        '',
        'Vezi [caietele](https://example.org/caiete).',
      ].join('\n'),
    );
  });

  it('turns a Google Docs paste into a heading, bold, italic, a numbered list and a link', () => {
    const markdown = markdownAfterPaste(googleDocsHtml);
    expect(markdown).toBe(
      [
        '## Marți',
        '',
        '**Au fost** 14 grade, *vânt ușor*.',
        '',
        '1. Dimineața',
        '2. Seara',
        '',
        '[prognoza](https://example.org/prognoza)',
      ].join('\n'),
    );
  });

  it('drops scripts, pictures, styles, event handlers and script links, keeping the words', () => {
    const cleaned = cleanPastedHtml(maliciousHtml);
    expect(cleaned).not.toContain('<script');
    expect(cleaned).not.toContain('<img');
    expect(cleaned).not.toContain('<iframe');
    expect(cleaned).not.toContain('onclick');
    expect(cleaned).not.toContain('onerror');
    const markdown = markdownAfterPaste(maliciousHtml);
    expect(markdown).toBe(
      [
        'Salut lume',
        '',
        'Click aici sau [acolo](https://example.org)',
        '',
        '**Gras** și *cursiv*',
      ].join('\n'),
    );
  });

  it('leaves plain paragraphs alone', () => {
    expect(markdownAfterPaste('<p>Unu</p><p>Doi</p>')).toBe('Unu\n\nDoi');
  });
});
