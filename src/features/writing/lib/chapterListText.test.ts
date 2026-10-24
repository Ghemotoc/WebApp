/**
 * The words Manage chapters shows about chapters (story S1-E3-04; board 4.4), checked with the
 * real English and Romanian locale files.
 */
import i18next, { type TFunction } from 'i18next';
import { beforeAll, describe, expect, it } from 'vitest';

import enWriting from '@/locales/en/writing.json';
import roWriting from '@/locales/ro/writing.json';

import type { ManagedChapter } from '../api/manageChapters';
import { chapterMeta, chapterSummary, deletedMeta } from './chapterListText';

let english: TFunction;
let romanian: TFunction;

beforeAll(async () => {
  const instance = i18next.createInstance();
  await instance.init({
    lng: 'en',
    resources: { en: { writing: enWriting }, ro: { writing: roWriting } },
    defaultNS: 'writing',
  });
  english = instance.getFixedT('en', 'writing');
  romanian = instance.getFixedT('ro', 'writing');
});

/** A chapter with sensible defaults. */
function chapter(changes: Partial<ManagedChapter>): ManagedChapter {
  return {
    code: 'abcdefgh',
    position: 1,
    title: 'Capitolul unu',
    state: 'draft',
    wordCount: 228,
    draftSavedAt: '2026-10-23T09:00:00Z',
    firstPublishedAt: null,
    editedAt: null,
    scheduledFor: null,
    unpublishedAt: null,
    deletedAt: null,
    ...changes,
  };
}

describe('chapterSummary', () => {
  it('counts each state in the board order and leaves out empty ones except published', () => {
    const chapters = [
      chapter({ state: 'published' }),
      chapter({ state: 'published' }),
      chapter({ state: 'draft' }),
      chapter({ state: 'scheduled' }),
    ];
    expect(chapterSummary(english, chapters)).toBe('2 published, 1 draft, 1 scheduled');
    expect(chapterSummary(english, [chapter({ state: 'draft' })])).toBe('0 published, 1 draft');
  });

  it('uses Romanian plurals', () => {
    const drafts = Array.from({ length: 20 }, () => chapter({ state: 'draft' }));
    expect(chapterSummary(romanian, [chapter({ state: 'published' })])).toBe('1 publicat');
    expect(chapterSummary(romanian, drafts)).toBe('0 publicate, 20 de ciorne');
  });

  it('says so when there are no chapters', () => {
    expect(chapterSummary(english, [])).toBe('No chapters yet');
  });
});

describe('chapterMeta', () => {
  it('a published chapter shows when, and the "Edited on" readers see once it changed', () => {
    const published = chapter({ state: 'published', firstPublishedAt: '2026-09-05T10:00:00Z' });
    expect(chapterMeta(english, published, 'en')).toBe('Published Sep 5');
    expect(chapterMeta(english, { ...published, editedAt: '2026-10-12T10:00:00Z' }, 'en')).toBe(
      'Published Sep 5 · readers see “Edited on Oct 12”',
    );
  });

  it('a draft shows its words and when it was saved', () => {
    expect(chapterMeta(english, chapter({}), 'en')).toBe('Draft · 228 words · saved Oct 23');
    expect(chapterMeta(romanian, chapter({ wordCount: 1 }), 'ro')).toMatch(
      /^Ciornă · 1 cuvânt · salvat pe 23 oct/,
    );
  });

  it('a scheduled chapter shows when it goes live in Romania time', () => {
    const scheduled = chapter({ state: 'scheduled', scheduledFor: '2026-10-24T15:00:00Z' });
    expect(chapterMeta(english, scheduled, 'en')).toBe(
      'Goes live Saturday, October 24 at 18:00, Romania time',
    );
  });

  it('an unpublished chapter says readers can’t open it and comments are kept', () => {
    const unpublished = chapter({ state: 'unpublished', unpublishedAt: '2026-10-20T10:00:00Z' });
    expect(chapterMeta(english, unpublished, 'en')).toBe(
      'Unpublished Oct 20 · readers can’t open it · comments hidden but kept',
    );
  });
});

describe('deletedMeta', () => {
  it('shows the day it was deleted and the day it goes for good, 30 days later', () => {
    expect(deletedMeta(english, '2026-10-14T10:00:00Z', 'en')).toBe(
      'Deleted Oct 14 · gone for good on November 13, 2026',
    );
  });
});
