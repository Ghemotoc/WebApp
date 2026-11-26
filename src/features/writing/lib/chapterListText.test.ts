/**
 * The words a story's Chapters page shows about chapters (story S1-E3-04; board D03, user story
 * 5.3), checked with the real English and Romanian locale files.
 */
import i18next, { type TFunction } from 'i18next';
import { beforeAll, describe, expect, it } from 'vitest';

import enWriting from '@/locales/en/writing.json';
import roWriting from '@/locales/ro/writing.json';

import { inTimeZone } from '@/test/viewerTimeZone';

import type { ManagedChapter } from '../api/manageChapters';
import type { MetaFact } from '@/components/ui/MetaLine';

import { chapterMovedNote, chapterRowFacts, chapterSummary, deletedFacts } from './chapterListText';

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
    wasPosition: null,
    wasPicked: false,
    isMarkedLast: false,
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

/** The facts as the line reads them, joined by middots, the state marked with an asterisk. */
function asLine(facts: MetaFact[]): string {
  return facts.map((fact) => (fact.kind === 'state' ? `*${fact.text}` : fact.text)).join(' · ');
}

/** A moment well after every date below, so no fact says "today" by accident. */
const later = new Date('2026-11-20T10:00:00Z');

/** The row options in English, with no likes. */
const inEnglish = { language: 'en', now: later, likes: null };

describe('chapterRowFacts', () => {
  it('a published chapter shows the day, the words and the "Edited on" readers see', () => {
    const published = chapter({ state: 'published', firstPublishedAt: '2026-09-05T10:00:00Z' });
    expect(asLine(chapterRowFacts(english, published, inEnglish))).toBe(
      '*Published · 5 Sep · 228 words',
    );
    const edited = { ...published, editedAt: '2026-10-12T10:00:00Z' };
    expect(asLine(chapterRowFacts(english, edited, inEnglish))).toBe(
      '*Published · 5 Sep · readers see “Edited on 12 Oct” · 228 words',
    );
  });

  it('a chapter out today says "today", and its likes and the last-chapter mark follow', () => {
    const today = chapter({
      state: 'published',
      firstPublishedAt: '2026-11-20T08:00:00Z',
      isMarkedLast: true,
    });
    inTimeZone('Europe/Bucharest', () => {
      expect(asLine(chapterRowFacts(english, today, { ...inEnglish, likes: 212 }))).toBe(
        '*Published · today · 228 words · 212 likes · the last chapter',
      );
    });
  });

  it('a draft shows when it was saved and its words', () => {
    expect(asLine(chapterRowFacts(english, chapter({}), inEnglish))).toBe(
      '*Draft · saved 23 Oct · 228 words',
    );
    const facts = chapterRowFacts(romanian, chapter({ wordCount: 1 }), {
      ...inEnglish,
      language: 'ro',
    });
    expect(asLine(facts)).toMatch(/^\*Ciornă · salvat pe 23 oct.* · 1 cuvânt$/);
  });

  it('a scheduled chapter shows when it goes live on the writer’s own clock (CALM-8b)', () => {
    const scheduled = chapter({ state: 'scheduled', scheduledFor: '2026-10-24T15:00:00Z' });
    inTimeZone('Europe/Bucharest', () => {
      expect(asLine(chapterRowFacts(english, scheduled, inEnglish))).toBe(
        '*Scheduled · goes live Saturday 24 October at 18:00, local time · 228 words',
      );
    });
    inTimeZone('Europe/Stockholm', () => {
      const facts = chapterRowFacts(romanian, scheduled, { ...inEnglish, language: 'ro' });
      expect(asLine(facts)).toBe(
        '*Programat · apare sâmbătă, 24 octombrie la 17:00, ora locală · 228 de cuvinte',
      );
    });
  });

  it('an unpublished chapter says readers can’t open it and comments are kept', () => {
    const unpublished = chapter({ state: 'unpublished', unpublishedAt: '2026-10-20T10:00:00Z' });
    expect(asLine(chapterRowFacts(english, unpublished, inEnglish))).toBe(
      '*Unpublished · 20 Oct · readers can’t open it · comments hidden but kept · 228 words',
    );
  });

  it('a moved chapter says where it was, and likes show only on a published chapter', () => {
    const moved = chapter({ position: 14, wasPosition: 13 });
    expect(asLine(chapterRowFacts(english, moved, { ...inEnglish, likes: 40 }))).toBe(
      '*Draft · saved 23 Oct · 228 words · was chapter 13',
    );
  });
});

describe('deletedFacts', () => {
  it('shows the day it was deleted and how many of the 30 days are left', () => {
    const now = new Date('2026-10-17T10:00:00Z');
    inTimeZone('Europe/Bucharest', () => {
      expect(asLine(deletedFacts(english, '2026-10-14T10:00:00Z', { language: 'en', now }))).toBe(
        'Deleted 14 Oct · 27 days left',
      );
      expect(asLine(deletedFacts(romanian, '2026-10-14T10:00:00Z', { language: 'ro', now }))).toBe(
        'Șters pe 14 oct. · 27 de zile rămase',
      );
    });
  });

  it('never says fewer than 0 days', () => {
    const now = new Date('2026-12-30T10:00:00Z');
    expect(asLine(deletedFacts(english, '2026-10-14T10:00:00Z', { language: 'en', now }))).toBe(
      'Deleted 14 Oct · 0 days left',
    );
  });
});

describe('chapterMovedNote', () => {
  it('a chapter that only shifted says the number it had', () => {
    const shifted = chapter({ position: 14, wasPosition: 13 });
    expect(chapterMovedNote(english, shifted)).toBe('was chapter 13');
    expect(chapterMovedNote(romanian, shifted)).toBe('a fost capitolul 13');
  });

  it('the chapter the writer moved says where it came from', () => {
    const picked = chapter({ position: 13, wasPosition: 14, wasPicked: true });
    expect(chapterMovedNote(english, picked)).toBe('moved here from chapter 14');
    expect(chapterMovedNote(romanian, picked)).toBe('mutat aici de la capitolul 14');
  });

  it('a chapter that never moved, or is back at its number, has no note', () => {
    expect(chapterMovedNote(english, chapter({ position: 3 }))).toBeNull();
    expect(chapterMovedNote(english, chapter({ position: 3, wasPosition: 3 }))).toBeNull();
  });
});
