/**
 * Tests for making a copy start to finish (story S1-E13-02). Supabase is a small fake that
 * records every call; the database rules are in supabase/tests/database/210-download-my-data.test.sql.
 */
import JSZip from 'jszip';
import { describe, expect, it, vi } from 'vitest';

import type { AppSupabaseClient } from '@/lib/supabase';
import type { WordLabels } from '@/lib/word/wordTypes';

import { dataExportRunState, startDataExport } from './exportRunStore';
import { makeDataExport } from './runDataExport';

const wordLabels: WordLabels = {
  byLine: (name) => `By ${name}`,
  userId: 'User ID',
  created: 'Created',
  firstPublished: 'First published',
  lastUpdated: 'Last updated',
  lastPublished: 'Last published',
  notPublishedYet: 'Not published yet',
  status: 'Status',
  chapterNumber: (number) => `Chapter ${number}`,
  pictureMissing: (alt) => `Picture: ${alt}`,
  embedLine: (title) => `Music or video: ${title}`,
  embedMissing: 'Gone',
};

/** The data file the fake database answers. */
const dataFile = {
  format: 'data-export/1',
  made_at: '2026-11-01T00:00:00Z',
  user_id: 'user-1',
  account: { email: 'lia@example.test', profile: { handle: 'lia', pen_name: 'Lia Scrie' } },
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
    comments: [],
  },
};

/** A fake client: rpc answers by name, the exports table lists one older copy, storage records. */
function fakeClient(options: { failUpload?: boolean } = {}) {
  const calls: string[] = [];
  let uploaded: Uint8Array | null = null;
  const answers: Record<string, unknown> = {
    request_data_export: { export_id: 'new', file_name: 'new.zip' },
    my_data_export: dataFile,
    finish_data_export: { expires_at: '2026-11-08' },
  };
  const olderCopy = {
    id: 'old',
    state: 'ready',
    file_name: 'old.zip',
    expires_at: '2999-01-01T00:00:00Z',
  };
  const client = {
    rpc: vi.fn(async (name: string) => {
      calls.push(`rpc:${name}`);
      return { data: answers[name], error: null };
    }),
    from: () => ({ select: () => ({ order: async () => ({ data: [olderCopy], error: null }) }) }),
    storage: {
      from: () => ({
        remove: async (names: string[]) => {
          calls.push(`remove:${names.join(',')}`);
          return { error: null };
        },
        upload: async (name: string, file: Blob) => {
          calls.push(`upload:${name}`);
          uploaded = new Uint8Array(await file.arrayBuffer());
          return { error: options.failUpload === true ? { message: 'refused' } : null };
        },
        download: async () => ({ data: null, error: { message: 'none' } }),
      }),
    },
  } as unknown as AppSupabaseClient;
  return { client, calls, uploadedZip: () => uploaded };
}

/** The run's options with the fake client. */
function runOptions(client: AppSupabaseClient) {
  return {
    client,
    wordLabels,
    statusLabels: {
      story: { ongoing: 'Ongoing', completed: 'Completed' },
      chapter: { draft: 'Draft', scheduled: 'Scheduled', published: 'Published' },
    },
    formatDate: (isoDate: string) => isoDate.slice(0, 10),
  };
}

describe('makeDataExport', () => {
  it('opens a copy, reads the data, deletes the older file, uploads, then finishes', async () => {
    const fake = fakeClient();
    await expect(makeDataExport(runOptions(fake.client))).resolves.toBe(1);
    expect(fake.calls).toEqual([
      'rpc:request_data_export',
      'rpc:my_data_export',
      'remove:old.zip',
      'upload:new.zip',
      'rpc:finish_data_export',
    ]);
  });

  it('uploads one ZIP with the data file and every story as a Word file', async () => {
    const fake = fakeClient();
    await makeDataExport(runOptions(fake.client));
    const zip = await JSZip.loadAsync(fake.uploadedZip() ?? new Uint8Array());
    expect(Object.keys(zip.files).sort()).toEqual(['data.json', 'stories/', 'stories/ploaia.docx']);
    const data = JSON.parse((await zip.file('data.json')?.async('string')) ?? '{}');
    expect(data.user_id).toBe('user-1');
    expect(data.tables.chapters[0].draft_body).toBe('Ș și ț.');
  });
});

describe('startDataExport', () => {
  it('shows a failure as a state the panel can read, never as a thrown error', async () => {
    const fake = fakeClient({ failUpload: true });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await startDataExport(runOptions(fake.client));
    expect(dataExportRunState()).toEqual({
      phase: 'failed',
      message: 'Could not save the copy: refused',
    });
    expect(fake.calls).not.toContain('rpc:finish_data_export');
  });
});
