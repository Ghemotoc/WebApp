/**
 * Tests for building and sending a data request's copy (bundle ADMIN-2, part c2; story
 * S1-E11-09). Supabase is a small fake that records every call; the database rules are in
 * supabase/tests/database/243-data-request-copy.test.sql.
 */
import JSZip from 'jszip';
import { describe, expect, it, vi } from 'vitest';

import type { AppSupabaseClient } from '@/lib/supabase';
import type { WordLabels } from '@/lib/word/wordTypes';

import { DataRequestError } from '../api/dataRequests';

import {
  copyFileType,
  makeDataRequestCopy,
  separateFileName,
  type DataRequestCopyFormat,
} from './runDataRequestCopy';

const wordLabels: WordLabels = {
  byLine: (name) => `De ${name}`,
  userId: 'ID utilizator',
  created: 'Creată',
  firstPublished: 'Publicată prima dată',
  lastUpdated: 'Actualizată',
  lastPublished: 'Publicată ultima dată',
  notPublishedYet: 'Nepublicată',
  status: 'Stare',
  chapterNumber: (number) => `Capitolul ${number}`,
  pictureMissing: (alt) => `Imagine: ${alt}`,
  embedLine: (title) => `Muzică sau video: ${title}`,
  embedMissing: 'Dispărut',
};

/** The person's data file the fake database answers: one story, one draft chapter, a library. */
const dataFile = {
  format: 'data-export/1',
  made_at: '2026-11-02T00:00:00Z',
  user_id: 'person-1',
  account: { profile: { handle: 'lia', pen_name: null } },
  library: [
    {
      shelf: 'saved',
      title: 'Farul',
      writer: 'Ana',
      path: '/s/farul',
      added_at: '2026-10-20T08:00:00Z',
      moved_at: '2026-10-20T08:00:00Z',
    },
  ],
  tables: {
    stories: [
      {
        id: 's1',
        slug: 'ploaia',
        title: 'Ploaia de toamnă',
        language_code: 'ro',
        completion_status: 'ongoing',
        created_at: '2026-10-01T00:00:00Z',
        first_published_at: null,
        updated_at: '2026-10-02T00:00:00Z',
        deleted_at: null,
      },
    ],
    chapters: [
      {
        id: 'c1',
        story_id: 's1',
        position: 1,
        draft_title: 'Începutul',
        draft_body: 'Ș și ț.',
        published_title: null,
        status: 'draft',
        created_at: '2026-10-01T00:00:00Z',
        first_published_at: null,
        last_published_at: null,
        deleted_at: null,
      },
    ],
  },
};

/** A fake client: the four staff functions answer by name; storage records every upload. */
function fakeClient(options: { refuse?: string } = {}) {
  const calls: string[] = [];
  const uploads = new Map<string, { bytes: Uint8Array; type: string }>();
  const client = {
    rpc: vi.fn(async (name: string, args: { files?: Array<{ display_name: string }> }) => {
      calls.push(`rpc:${name}`);
      if (name === options.refuse) {
        return { data: null, error: { hint: 'identity_not_checked', code: '23514' } };
      }
      if (name === 'admin_data_request_export') return { data: dataFile, error: null };
      if (name === 'admin_open_data_request_copy') {
        const opened = (args.files ?? []).map((file, index) => ({
          export_id: `e${index}`,
          file_name: `random-${index}${file.display_name.slice(file.display_name.lastIndexOf('.'))}`,
          display_name: file.display_name,
        }));
        return { data: opened, error: null };
      }
      return { data: {}, error: null };
    }),
    storage: {
      from: () => ({
        upload: async (name: string, file: Blob, settings: { contentType: string }) => {
          calls.push(`upload:${name}`);
          uploads.set(name, {
            bytes: new Uint8Array(await file.arrayBuffer()),
            type: settings.contentType,
          });
          return { error: null };
        },
        download: async () => ({ data: null, error: { message: 'none' } }),
      }),
    },
  } as unknown as AppSupabaseClient;
  return { client, calls, uploads };
}

/** The guide's words for the tests: English, with every table described the same way (IDEAS-2a). */
const guideWords = (madeAt: string) => ({
  fileName: 'READ ME FIRST.txt',
  title: 'Data, explained',
  intro: `Made on ${madeAt.slice(0, 10)}.`,
  filesHeading: 'The files',
  files: { data: 'data.json', stories: 'stories/', plans: 'plans', library: 'library.csv' },
  partsHeading: 'Inside data.json',
  parts: {
    format: 'format',
    user_id: 'user_id',
    account: 'account',
    library: 'library',
    tables: 'tables',
  },
  tablesHeading: 'The groups',
  tableLine: (tableName: string) => `about ${tableName}`,
  empty: '(empty)',
  help: 'Write to us.',
});

/** The run's options with the fake client. */
function runOptions(client: AppSupabaseClient, format: DataRequestCopyFormat) {
  return {
    client,
    wordLabels,
    statusLabels: {
      story: { ongoing: 'În curs', completed: 'Încheiată' },
      chapter: { draft: 'Ciornă', scheduled: 'Programat', published: 'Publicat' },
    },
    formatDate: (isoDate: string) => isoDate.slice(0, 10),
    planText: { atlas: (key: string) => key, own: (key: string) => key },
    libraryLabels: {
      shelf: 'Raft',
      title: 'Titlu',
      writer: 'Autor',
      link: 'Link',
      added: 'Adăugată',
      shelves: { reading: 'Citesc', saved: 'Pentru mai târziu', finished: 'Terminate' },
    },
    guideWords,
    requestId: 'request-1',
    reference: 'D-000007',
    format,
  };
}

describe('makeDataRequestCopy', () => {
  it('reads the person’s data, opens the files, uploads them, then sends the copy', async () => {
    const fake = fakeClient();
    await expect(makeDataRequestCopy(runOptions(fake.client, 'zip'))).resolves.toBe(1);
    expect(fake.calls).toEqual([
      'rpc:admin_data_request_export',
      'rpc:admin_open_data_request_copy',
      'upload:random-0.zip',
      'rpc:admin_finish_data_request_copy',
    ]);
  });

  it('sends one ZIP with the data file, every story and plan in Word and PDF and the library', async () => {
    const fake = fakeClient();
    await makeDataRequestCopy(runOptions(fake.client, 'zip'));
    const upload = fake.uploads.get('random-0.zip');
    expect(upload?.type).toBe('application/zip');
    const zip = await JSZip.loadAsync(upload?.bytes ?? new Uint8Array());
    expect(Object.keys(zip.files)[0]).toBe('READ ME FIRST.txt');
    expect(Object.keys(zip.files).sort()).toEqual([
      'READ ME FIRST.txt',
      'data.json',
      'library.csv',
      'stories/',
      'stories/ploaia-plan.docx',
      'stories/ploaia-plan.pdf',
      'stories/ploaia.docx',
      'stories/ploaia.pdf',
    ]);
    const data = JSON.parse((await zip.file('data.json')?.async('string')) ?? '{}');
    expect(data.user_id).toBe('person-1');
    expect(data.tables.chapters[0].draft_body).toBe('Ș și ț.');
  });

  it('sends each file on its own, with the type that matches its ending', async () => {
    const fake = fakeClient();
    await expect(makeDataRequestCopy(runOptions(fake.client, 'separate'))).resolves.toBe(6);
    const opened = fake.client.rpc as unknown as { mock: { calls: unknown[][] } };
    expect(opened.mock.calls[1]?.[1]).toEqual({
      target_request_id: 'request-1',
      files: [
        { display_name: 'data.json' },
        { display_name: 'ploaia.docx' },
        { display_name: 'ploaia.pdf' },
        { display_name: 'ploaia-plan.docx' },
        { display_name: 'ploaia-plan.pdf' },
        { display_name: 'library.csv' },
      ],
    });
    expect([...fake.uploads.values()].map((upload) => upload.type)).toEqual([
      'application/json',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/pdf',
      'text/csv',
    ]);
  });

  it('stops at the database’s refusal and sends nothing', async () => {
    const fake = fakeClient({ refuse: 'admin_data_request_export' });
    await expect(makeDataRequestCopy(runOptions(fake.client, 'zip'))).rejects.toEqual(
      new DataRequestError('identity_not_checked'),
    );
    expect(fake.calls).toEqual(['rpc:admin_data_request_export']);
  });
});

describe('separateFileName', () => {
  it('drops the folder a ZIP would have', () => {
    expect(separateFileName('stories/ploaia.docx')).toBe('ploaia.docx');
  });
  it('keeps only the characters the database accepts, starting with a letter or digit', () => {
    expect(separateFileName('stories/-ș pă.docx')).toBe('p-.docx');
    expect(separateFileName('stories/---.docx')).toBe('file.docx');
  });
});

describe('copyFileType', () => {
  it('names the type by the ending', () => {
    expect(copyFileType('a.docx')).toContain('wordprocessingml');
    expect(copyFileType('data.json')).toBe('application/json');
    expect(copyFileType('library.csv')).toBe('text/csv');
    expect(copyFileType('D-000001-copy.zip')).toBe('application/zip');
  });
});
