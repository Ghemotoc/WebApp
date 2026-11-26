/**
 * Tests for planRowFacts.ts: the words fact and the last fact of a row on /plan (board E20;
 * user stories bundle 6, story 6.1).
 */
import { describe, expect, it } from 'vitest';

import type { StoryPlanSummary } from '../api/storyPlanList';

import { planProgressFact, planWordsFact } from './planRowFacts';

const now = new Date('2026-11-25T12:00:00Z');

/** A drafting plan last edited two days before `now`, with nothing published. */
function plan(changes: Partial<StoryPlanSummary> = {}): StoryPlanSummary {
  return {
    slug: 'salt-mine-choir',
    logline: '',
    writingStatus: 'drafting',
    wordTarget: 40000,
    wordsWritten: 31640,
    publishedChapters: 0,
    editedAt: '2026-11-23T12:00:00Z',
    ...changes,
  };
}

describe('planWordsFact', () => {
  it('shows the words against the target while the story is being written', () => {
    expect(planWordsFact(plan())).toEqual({ kind: 'ofTarget', written: 31640, target: 40000 });
  });

  it('shows the words alone once the story is finished', () => {
    expect(planWordsFact(plan({ writingStatus: 'finished' }))).toEqual({
      kind: 'wordsOnly',
      written: 31640,
    });
  });

  it('shows the words alone when there is no target', () => {
    expect(planWordsFact(plan({ wordTarget: 0 })).kind).toBe('wordsOnly');
  });
});

describe('planProgressFact', () => {
  it('says when the story was edited if that was in the last day', () => {
    const editedAt = '2026-11-25T11:50:00Z';
    expect(planProgressFact(plan({ editedAt, publishedChapters: 6 }), 'fiction', now)).toEqual({
      kind: 'edited',
      editedAt,
    });
  });

  it('counts the published chapters of an older story', () => {
    expect(planProgressFact(plan({ publishedChapters: 6 }), 'fiction', now)).toEqual({
      kind: 'chaptersOut',
      count: 6,
    });
  });

  it('counts poems for poetry and essays for essays', () => {
    expect(planProgressFact(plan({ publishedChapters: 5 }), 'poetry', now).kind).toBe('poemsOut');
    expect(planProgressFact(plan({ publishedChapters: 3 }), 'nonfiction_essays', now).kind).toBe(
      'essaysOut',
    );
  });

  it('says a story with nothing out is not published', () => {
    expect(planProgressFact(plan(), 'fiction', now)).toEqual({ kind: 'notPublished' });
  });
});
