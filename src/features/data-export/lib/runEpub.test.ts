/**
 * Tests for making a completed story's EPUB start to finish (story S1-E13-05, PRIVACY part f;
 * Robert, 1 Nov 2026, 06:31 to 06:34). Supabase is a small fake that answers the data file; the
 * covers are drawn by fakes, because jsdom has no canvas (the e2e test draws real ones).
 */
import i18next, { type TFunction } from 'i18next';
import JSZip from 'jszip';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import englishDataExport from '@/locales/en/dataExport.json';
import type { AppSupabaseClient } from '@/lib/supabase';

import { makeEpub, type CoverPainters, type EpubForm } from './runEpub';

/** One story row of the data file. */
function storyRow(completionStatus: 'ongoing' | 'completed') {
  return {
    id: 's1',
    slug: 'ploaia',
    title: 'Ploaia',
    language_code: 'en',
    completion_status: completionStatus,
    created_at: '2026-10-01T00:00:00Z',
    first_published_at: '2026-10-02T00:00:00Z',
    updated_at: '2026-10-03T00:00:00Z',
    deleted_at: null,
    cover_kind: 'automatic',
    cover_design: null,
    cover_background: null,
    cover_accent: null,
  };
}

/** One chapter of the story. */
function chapterRow(id: string, position: number, status: string, more = {}) {
  return {
    id,
    story_id: 's1',
    position,
    draft_title: `Draft ${position}`,
    draft_body: `The draft words of ${position}.`,
    published_title: `Published ${position}`,
    published_body: `The published words of ${position}.`,
    status,
    created_at: '2026-10-01T00:00:00Z',
    first_published_at: null,
    last_published_at: null,
    deleted_at: null,
    ...more,
  };
}

/** The data file: three published chapters (one untitled, out of order), a draft, a deleted one. */
function dataFile(completionStatus: 'ongoing' | 'completed' = 'completed') {
  return {
    format: 'data-export/1',
    made_at: '2026-11-01T00:00:00Z',
    user_id: 'user-1',
    account: { profile: { handle: 'lia', pen_name: 'Lia P.' } },
    tables: {
      stories: [storyRow(completionStatus), { ...storyRow('completed'), id: 's2', slug: 'alta' }],
      chapters: [
        chapterRow('c3', 3, 'published', { published_title: null }),
        chapterRow('c1', 1, 'published'),
        chapterRow('c2', 2, 'draft', { published_body: null }),
        chapterRow('c4', 4, 'published', { deleted_at: '2026-10-20T00:00:00Z' }),
        chapterRow('c5', 5, 'published'),
      ],
      story_bible_entries: [{ id: 'b1', story_id: 's1', body: 'A secret of the plan.' }],
    },
  };
}

/** A fake client whose my_data_export answers the given file. */
function fakeClient(document: unknown) {
  return {
    rpc: vi.fn(async () => ({ data: document, error: null })),
    storage: {
      from: () => ({ download: async () => ({ data: null, error: { message: 'none' } }) }),
    },
  } as unknown as AppSupabaseClient;
}

/** Fake painters that record which way the cover was made. */
function fakePainters() {
  const made: string[] = [];
  const cover = { data: new Uint8Array([9]), type: 'jpg' as const, width: 5, height: 8 };
  const painters: CoverPainters = {
    drawn: async (words) => {
      made.push(`drawn:${words.title}:${words.name}:${words.choice.design}`);
      return cover;
    },
    picture: async () => {
      made.push('picture');
      return cover;
    },
  };
  return { painters, made };
}

let bookText: TFunction;

beforeAll(async () => {
  const instance = i18next.createInstance();
  await instance.init({
    lng: 'en',
    resources: { en: { dataExport: englishDataExport } },
    interpolation: { escapeValue: false, defaultVariables: { productName: 'TheApp' } },
  });
  bookText = instance.getFixedT('en', 'dataExport');
});

/** Makes the book with the given file and form. */
async function makeWith(document: unknown, form: Partial<EpubForm> = {}) {
  const fake = fakePainters();
  const book = await makeEpub({
    client: fakeClient(document),
    storyId: 's1',
    form: { name: 'Ana Ionescu', title: 'Ploaia', cover: { kind: 'story' }, ...form },
    bookText,
    bookLanguage: 'en',
    madeAt: new Date('2026-11-01T10:00:00Z'),
    coverPainters: fake.painters,
  });
  return { book, made: fake.made, zip: await JSZip.loadAsync(book.bytes) };
}

describe('makeEpub', () => {
  it('holds only the published chapters, in reading order, numbered from 1', async () => {
    const { book, zip } = await makeWith(dataFile());
    expect(book.fileName).toBe('ploaia.epub');
    const nav = (await zip.file('OEBPS/nav.xhtml')?.async('string')) ?? '';
    expect(nav).toContain('Chapter 1: Published 1');
    expect(nav).toContain('Chapter 2</a>');
    expect(nav).toContain('Chapter 3: Published 5');
    expect(nav).not.toContain('Draft');
    const second = (await zip.file('OEBPS/chapter-2.xhtml')?.async('string')) ?? '';
    expect(second).toContain('The published words of 3.');
    expect(zip.file('OEBPS/chapter-4.xhtml')).toBeNull();
  });

  it('never holds the plan from Story Atlas or another story', async () => {
    const { zip } = await makeWith(dataFile());
    const everything = await Promise.all(
      Object.values(zip.files).map((file) => file.async('string')),
    );
    expect(everything.join('\n')).not.toContain('A secret of the plan.');
    expect(Object.keys(zip.files).filter((name) => name.includes('chapter-'))).toHaveLength(3);
  });

  it('prints the typed name and the filled-in copyright lines', async () => {
    const { zip } = await makeWith(dataFile());
    const copyright = (await zip.file('OEBPS/copyright.xhtml')?.async('string')) ?? '';
    expect(copyright).toContain('© 2026 Ana Ionescu. All rights reserved.');
    expect(copyright).toContain('prepared through TheApp');
    expect(copyright).toContain('1 November 2026');
    const opf = (await zip.file('OEBPS/content.opf')?.async('string')) ?? '';
    expect(opf).toContain('<dc:creator>Ana Ionescu</dc:creator>');
  });

  it('draws the story’s automatic cover with the confirmed title and name', async () => {
    const { made } = await makeWith(dataFile(), { title: 'Ploaia, ediția întâi' });
    expect(made).toHaveLength(1);
    expect(made[0]).toMatch(/^drawn:Ploaia, ediția întâi:Ana Ionescu:/);
  });

  it('uses the picture the writer picked instead', async () => {
    const { made } = await makeWith(dataFile(), { cover: { kind: 'file', file: new Blob(['x']) } });
    expect(made).toEqual(['picture']);
  });

  it('refuses a story that isn’t completed', async () => {
    await expect(makeWith(dataFile('ongoing'))).rejects.toThrow('Only a completed story');
  });

  it('refuses a story with no published chapter', async () => {
    const document = dataFile();
    document.tables.chapters = [chapterRow('c2', 2, 'draft', { published_body: null })];
    await expect(makeWith(document)).rejects.toThrow('no published chapter');
  });
});
