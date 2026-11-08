/**
 * Tests for cmsPlainText (G5b): CMS Markdown as plain words, and a help page's reading time.
 */
import { describe, expect, it } from 'vitest';

import { markdownAsPlainText, readingMinutes } from './cmsPlainText';

describe('markdownAsPlainText', () => {
  it('drops the Markdown marks but keeps the words and the paragraphs', () => {
    const text = markdownAsPlainText(
      'You **keep** the rights. Read [the terms](/legal/terms).\n\nMore.',
    );
    expect(text).toBe('You keep the rights. Read the terms.\n\nMore.');
  });

  it('leaves out raw HTML, which the page never shows either', () => {
    expect(markdownAsPlainText('Hello <b>there</b>')).not.toContain('<b>');
  });
});

describe('readingMinutes', () => {
  it('a short page takes one minute', () => {
    expect(readingMinutes('A few **words**.')).toBe(1);
  });

  it('counts about 200 words a minute, rounded up', () => {
    expect(readingMinutes(Array.from({ length: 401 }, () => 'word').join(' '))).toBe(3);
  });
});
