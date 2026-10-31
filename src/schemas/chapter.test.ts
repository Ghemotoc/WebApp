/**
 * The chapter draft's rules (story S1-E3-02a).
 */
import { describe, expect, it } from 'vitest';

import { chapterDraftSchema } from './chapter';

const good = { title: ' Capitolul unu ', body: 'Bunica **notează** vremea.', expectedVersion: 1 };

describe('chapterDraftSchema', () => {
  it('accepts a normal draft and trims the title', () => {
    const result = chapterDraftSchema.safeParse(good);
    expect(result.success).toBe(true);
    expect(result.data?.title).toBe('Capitolul unu');
  });

  it('corrects ş and ţ to ș and ț in the title and the body (rule 4)', () => {
    const result = chapterDraftSchema.safeParse({ ...good, title: 'Poveşti', body: 'Aşa şi ţie.' });
    expect(result.data?.title).toBe('Povești');
    expect(result.data?.body).toBe('Așa și ție.');
  });

  it('refuses HTML tags and script links with their message keys (rule 8)', () => {
    const html = chapterDraftSchema.safeParse({ ...good, body: 'x <script>alert(1)</script>' });
    expect(html.error?.issues[0]?.message).toBe('errors.htmlNotAllowed');
    const link = chapterDraftSchema.safeParse({ ...good, body: '[x](javascript:alert(1))' });
    expect(link.error?.issues[0]?.message).toBe('errors.linkNotAllowed');
    expect(chapterDraftSchema.safeParse({ ...good, body: '3 < 4 is true' }).success).toBe(true);
    // Escaped text is literal text: the editor writes "\\<script\\>" for a writer who typed it.
    expect(chapterDraftSchema.safeParse({ ...good, body: 'Salut \\<script\\>' }).success).toBe(
      true,
    );
    expect(chapterDraftSchema.safeParse({ ...good, body: 'x \\\\<script>' }).success).toBe(false);
  });

  it('refuses an over-long title or body', () => {
    expect(chapterDraftSchema.safeParse({ ...good, title: 't'.repeat(121) }).success).toBe(false);
    expect(chapterDraftSchema.safeParse({ ...good, body: 'a'.repeat(100_001) }).success).toBe(
      false,
    );
  });
  it('refuses a picture without alt text, alt text over 300 characters and too many pictures (S1-E3-09)', () => {
    const pictureId = '0b9c2f4e-3a52-4c36-9b0e-2f7d1d0e5a11';
    const picture = (alt: string) => `![${alt}](picture:${pictureId})`;
    const noAlt = chapterDraftSchema.safeParse({ ...good, body: picture('  ') });
    expect(noAlt.error?.issues[0]?.message).toBe('errors.pictureNeedsAlt');
    const longAlt = chapterDraftSchema.safeParse({ ...good, body: picture('a'.repeat(301)) });
    expect(longAlt.error?.issues[0]?.message).toBe('errors.altTooLong');
    const many = chapterDraftSchema.safeParse({
      ...good,
      body: Array.from({ length: 31 }, () => picture('Hartă')).join('\n\n'),
    });
    expect(many.error?.issues[0]?.message).toBe('errors.tooManyPictures');
    expect(chapterDraftSchema.safeParse({ ...good, body: picture('Hartă') }).success).toBe(true);
  });
});
