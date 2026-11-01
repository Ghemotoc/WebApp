/**
 * Tests for making Download my stories' Word files start to finish (story S1-E13-05). Supabase is
 * a small fake that records every call; the database rules are in
 * supabase/tests/database/213-download-my-stories.test.sql.
 */
import JSZip from 'jszip';
import { describe, expect, it, vi } from 'vitest';

import type { AppSupabaseClient } from '@/lib/supabase';
import type { WordLabels } from '@/lib/word/wordTypes';

import { makeStoriesExport } from './runStoriesExport';
import { documentForStory } from './storiesForWord';

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

/** One story row of the data file. */
function storyRow(id: string, slug: string) {
  return {
    id,
    slug,
    title: slug,
    language_code: 'ro',
    completion_status: 'ongoing',
    created_at: '2026-10-01T00:00:00Z',
    first_published_at: null,
    updated_at: '2026-10-02T00:00:00Z',
    deleted_at: null,
  };
}

/** One draft chapter of a story. */
function chapterRow(id: string, storyId: string) {
  return {
    id,
    story_id: storyId,
    position: 1,
    draft_title: 'Începutul',
    draft_body: 'Ș și ț.',
    published_title: null,
    status: 'draft',
    created_at: '2026-10-01T00:00:00Z',
    first_published_at: null,
    last_published_at: null,
    deleted_at: null,
  };
}

/** The data file with two stories. */
const dataFile = {
  format: 'data-export/1',
  made_at: '2026-11-01T00:00:00Z',
  user_id: 'user-1',
  account: { profile: { handle: 'lia', pen_name: null } },
  tables: {
    stories: [storyRow('s1', 'ploaia'), storyRow('s2', 'vantul')],
    chapters: [chapterRow('c1', 's1'), chapterRow('c2', 's2')],
  },
};

/** A fake client whose request_stories_export answers the given outcome. */
function fakeClient(requestAnswer: Record<string, string>) {
  const calls: string[] = [];
  let uploaded: { bytes: Uint8Array; type: string } | null = null;
  const answers: Record<string, unknown> = {
    request_stories_export: requestAnswer,
    my_data_export: dataFile,
    finish_data_export: { expires_at: '2026-11-08' },
  };
  const client = {
    rpc: vi.fn(async (name: string) => {
      calls.push(`rpc:${name}`);
      return { data: answers[name], error: null };
    }),
    from: () => ({
      select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }),
    }),
    storage: {
      from: () => ({
        remove: async () => ({ error: null }),
        upload: async (name: string, file: Blob, settings: { contentType: string }) => {
          calls.push(`upload:${name}`);
          uploaded = {
            bytes: new Uint8Array(await file.arrayBuffer()),
            type: settings.contentType,
          };
          return { error: null };
        },
        download: async () => ({ data: null, error: { message: 'none' } }),
      }),
    },
  } as unknown as AppSupabaseClient;
  return { client, calls, uploaded: () => uploaded };
}

/** The run's options for one story or all. */
function runOptions(client: AppSupabaseClient, storyId: string | null) {
  return {
    client,
    wordLabels,
    statusLabels: {
      story: { ongoing: 'Ongoing', completed: 'Completed' },
      chapter: { draft: 'Draft', scheduled: 'Scheduled', published: 'Published' },
    },
    formatDate: (isoDate: string) => isoDate.slice(0, 10),
    storyId,
  };
}

describe('makeStoriesExport', () => {
  it('offers the earlier files and makes nothing when the database says they can be reused', async () => {
    const fake = fakeClient({ outcome: 'reused', export_id: 'old' });
    await expect(makeStoriesExport(runOptions(fake.client, 's1'))).resolves.toBe('reused');
    expect(fake.calls).toEqual(['rpc:request_stories_export']);
  });

  it('uploads one story as a single Word file, then finishes', async () => {
    const fake = fakeClient({ outcome: 'new', export_id: 'new', file_name: 'new.docx' });
    await expect(makeStoriesExport(runOptions(fake.client, 's1'))).resolves.toBe('made');
    expect(fake.calls).toEqual([
      'rpc:request_stories_export',
      'rpc:my_data_export',
      'upload:new.docx',
      'rpc:finish_data_export',
    ]);
    expect(fake.uploaded()?.type).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
  });

  it('puts all the stories in one ZIP of Word files, with no data file', async () => {
    const fake = fakeClient({ outcome: 'new', export_id: 'new', file_name: 'new.zip' });
    await makeStoriesExport(runOptions(fake.client, null));
    const zip = await JSZip.loadAsync(fake.uploaded()?.bytes ?? new Uint8Array());
    expect(Object.keys(zip.files).sort()).toEqual(['ploaia.docx', 'vantul.docx']);
  });
});

describe('documentForStory', () => {
  it('keeps only the chosen story and its chapters', () => {
    const narrowed = documentForStory(dataFile as never, 's2');
    expect(narrowed.tables.stories?.map((story) => story.id)).toEqual(['s2']);
    expect(narrowed.tables.chapters?.map((chapter) => chapter.id)).toEqual(['c2']);
  });

  it('keeps every story when none is chosen', () => {
    expect(documentForStory(dataFile as never, null)).toBe(dataFile);
  });
});
