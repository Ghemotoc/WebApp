/** Tests for turning the data file into the Word builder's input (story S1-E13-02). */
import { describe, expect, it } from 'vitest';

import type { DataExportDocument } from '../api/dataExport';

import { wordFileName, wordInputFrom, type StatusLabels } from './storiesForWord';

const labels: StatusLabels = {
  story: { ongoing: 'Ongoing', completed: 'Completed' },
  chapter: { draft: 'Draft', scheduled: 'Scheduled', published: 'Published' },
};

const shownPicture = '3f2a0000-0000-4000-8000-000000000001';

/** A data file with one live story (two chapters, one deleted) and one deleted story. */
function document(): DataExportDocument {
  const story = {
    slug: 'ploaia',
    title: 'Ploaia',
    language_code: 'ro',
    completion_status: 'ongoing' as const,
    created_at: '2026-10-01',
    first_published_at: null,
    updated_at: '2026-10-02',
    deleted_at: null,
    cover_kind: 'automatic' as const,
    cover_design: null,
    cover_background: null,
    cover_accent: null,
  };
  const chapter = {
    story_id: 's1',
    draft_title: '',
    published_title: 'Unu publicat',
    published_body: null,
    status: 'published' as const,
    created_at: '2026-10-01',
    first_published_at: '2026-10-01',
    last_published_at: null,
    deleted_at: null,
  };
  return {
    format: 'data-export/1',
    made_at: '2026-11-01',
    user_id: 'user-1',
    account: { profile: { handle: 'lia', pen_name: null } },
    tables: {
      stories: [
        { ...story, id: 's1' },
        { ...story, id: 's2', slug: 'sters', deleted_at: '2026-10-05' },
      ],
      chapters: [
        {
          ...chapter,
          id: 'c2',
          position: 2,
          draft_title: 'Doi',
          draft_body: `![Un gard](picture:${shownPicture})`,
          status: 'draft',
        },
        { ...chapter, id: 'c1', position: 1, draft_body: 'Text.' },
        { ...chapter, id: 'c3', position: 3, draft_body: 'Șters.', deleted_at: '2026-10-05' },
      ],
      chapter_embeds: [{ id: 'e1', title: null, source_url: 'https://vimeo.com/1' }],
      picture_checks: [
        { id: shownPicture, bucket: 'chapter-images', path: 'c2/a.webp', status: 'passed' },
        {
          id: '3f2a0000-0000-4000-8000-000000000009',
          bucket: 'covers',
          path: 'x.webp',
          status: 'passed',
        },
      ],
    },
  };
}

describe('wordInputFrom', () => {
  it('gives every story the person still has a Word file, with its live chapters in order', () => {
    const input = wordInputFrom(document(), labels);
    expect(input.stories.map((entry) => entry.slug)).toEqual(['ploaia']);
    const chapters = input.stories[0]?.story.chapters ?? [];
    expect(chapters.map((chapter) => chapter.position)).toEqual([1, 2]);
    expect(chapters.map((chapter) => chapter.statusLabel)).toEqual(['Published', 'Draft']);
  });

  it('uses the draft title, then the published one, and the username when there is no pen name', () => {
    const input = wordInputFrom(document(), labels);
    const story = input.stories[0]?.story;
    expect(story?.chapters.map((chapter) => chapter.title)).toEqual(['Unu publicat', 'Doi']);
    expect(story?.writerName).toBe('lia');
    expect(story?.userId).toBe('user-1');
  });

  it('loads only the pictures a chapter shows, and names a card without a title by its link', () => {
    const input = wordInputFrom(document(), labels);
    expect(input.pictures.map((picture) => picture.id)).toEqual([shownPicture]);
    expect(input.embeds.get('e1')).toEqual({
      title: 'https://vimeo.com/1',
      url: 'https://vimeo.com/1',
    });
  });
});

describe('wordFileName', () => {
  it('names each file after its story and never lets two clash', () => {
    const taken = new Set<string>();
    expect(wordFileName('ploaia', taken)).toBe('stories/ploaia.docx');
    expect(wordFileName('ploaia', taken)).toBe('stories/ploaia-2.docx');
    expect(wordFileName('../x', taken)).toBe('stories/---x.docx');
  });
});
