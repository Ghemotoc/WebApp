/**
 * Tests for making Download my stories' files start to finish (story S1-E13-05; the choices from
 * Robert, 1 Nov 2026, 06:27 and 06:29). Supabase is a small fake that records every call; the
 * database rules are in supabase/tests/database/213-download-my-stories.test.sql.
 */
import JSZip from 'jszip';
import { describe, expect, it, vi } from 'vitest';

import type { AppSupabaseClient } from '@/lib/supabase';
import type { WordLabels } from '@/lib/word/wordTypes';

import type { StoriesExportChoices } from '../api/dataExport';

import { makeStoriesExport } from './runStoriesExport';
import { documentForChoice } from './storiesForData';

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
    chapters: [
      chapterRow('c1', 's1'),
      chapterRow('c2', 's2'),
      { ...chapterRow('c3', 's2'), position: 2 },
    ],
    chapter_embeds: [
      { id: 'e3', chapter_id: 'c3', title: 'Song', source_url: 'https://example.com' },
    ],
    story_ideas: [
      {
        id: 'i1',
        story_id: 's2',
        kind: 'idea',
        body: 'A storm.',
        outcome: '',
        done_at: null,
        created_at: '2026-10-01',
      },
    ],
    comments: [{ id: 'm1', story_id: 's2', body: 'Not part of the story.' }],
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

/** The choices: one story or all, every chapter, the chapters only unless more is given. */
function choicesFor(storyId: string | null, more: Partial<StoriesExportChoices> = {}) {
  return {
    storyId,
    chapterIds: null,
    includeChapters: true,
    includePlan: false,
    includeData: false,
    ...more,
  };
}

/** The run's options for the choices. */
function runOptions(client: AppSupabaseClient, choices: StoriesExportChoices) {
  return {
    client,
    wordLabels,
    statusLabels: {
      story: { ongoing: 'Ongoing', completed: 'Completed' },
      chapter: { draft: 'Draft', scheduled: 'Scheduled', published: 'Published' },
    },
    formatDate: (isoDate: string) => isoDate.slice(0, 10),
    planText: {
      atlas: (key: string) => key,
      own: (key: string, values?: Record<string, string | number>) =>
        key === 'plan.title' ? `The plan of ${values?.title}` : key,
    },
    choices,
  };
}

describe('makeStoriesExport', () => {
  it('offers the earlier files and makes nothing when the database says they can be reused', async () => {
    const fake = fakeClient({ outcome: 'reused', export_id: 'old' });
    await expect(makeStoriesExport(runOptions(fake.client, choicesFor('s1')))).resolves.toBe(
      'reused',
    );
    expect(fake.calls).toEqual(['rpc:request_stories_export']);
  });

  it('uploads one story as a single Word file, then finishes', async () => {
    const fake = fakeClient({ outcome: 'new', export_id: 'new', file_name: 'new.docx' });
    await expect(makeStoriesExport(runOptions(fake.client, choicesFor('s1')))).resolves.toBe(
      'made',
    );
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
    await makeStoriesExport(runOptions(fake.client, choicesFor(null)));
    const zip = await JSZip.loadAsync(fake.uploaded()?.bytes ?? new Uint8Array());
    expect(Object.keys(zip.files).sort()).toEqual(['ploaia.docx', 'vantul.docx']);
  });
});

describe('makeStoriesExport with more files', () => {
  it('puts one story, its plan and its JSON copy in one ZIP', async () => {
    const fake = fakeClient({ outcome: 'new', export_id: 'new', file_name: 'new.zip' });
    await makeStoriesExport(
      runOptions(fake.client, choicesFor('s2', { includePlan: true, includeData: true })),
    );
    const zip = await JSZip.loadAsync(fake.uploaded()?.bytes ?? new Uint8Array());
    expect(Object.keys(zip.files).sort()).toEqual([
      'vantul-plan.docx',
      'vantul.docx',
      'vantul.json',
    ]);
    const copy = JSON.parse((await zip.file('vantul.json')?.async('string')) ?? '{}');
    expect(copy.tables.story_ideas[0].body).toBe('A storm.');
  });

  it('uploads the JSON copy alone as a JSON file', async () => {
    const fake = fakeClient({ outcome: 'new', export_id: 'new', file_name: 'new.json' });
    await makeStoriesExport(
      runOptions(fake.client, choicesFor('s2', { includeChapters: false, includeData: true })),
    );
    expect(fake.uploaded()?.type).toBe('application/json');
  });

  it('uploads the plan alone as its Word file', async () => {
    const fake = fakeClient({ outcome: 'new', export_id: 'new', file_name: 'new.docx' });
    await makeStoriesExport(
      runOptions(fake.client, choicesFor('s2', { includeChapters: false, includePlan: true })),
    );
    const word = await JSZip.loadAsync(fake.uploaded()?.bytes ?? new Uint8Array());
    expect(await word.file('word/document.xml')?.async('string')).toContain('The plan of vantul');
  });
});

describe('documentForChoice', () => {
  it('keeps only the chosen story, its chapters and its own tables', () => {
    const narrowed = documentForChoice(dataFile as never, choicesFor('s2'));
    expect(narrowed.tables.stories?.map((story) => story.id)).toEqual(['s2']);
    expect(narrowed.tables.chapters?.map((chapter) => chapter.id)).toEqual(['c2', 'c3']);
    expect(narrowed.tables.comments).toBeUndefined();
  });

  it('keeps only the chosen chapters and their cards, and the whole plan', () => {
    const narrowed = documentForChoice(dataFile as never, choicesFor('s2', { chapterIds: ['c2'] }));
    expect(narrowed.tables.chapters?.map((chapter) => chapter.id)).toEqual(['c2']);
    expect(narrowed.tables.chapter_embeds).toEqual([]);
    expect(narrowed.tables.story_ideas).toHaveLength(1);
  });

  it('keeps every story when none is chosen', () => {
    const narrowed = documentForChoice(dataFile as never, choicesFor(null));
    expect(narrowed.tables.stories?.map((story) => story.id)).toEqual(['s1', 's2']);
  });
});
