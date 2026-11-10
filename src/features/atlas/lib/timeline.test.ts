/**
 * Tests for lib/timeline.ts and lib/povLanes.ts: the timeline's order and the lanes' columns
 * (S1-E17-20 and S1-E17-21).
 */
import { describe, expect, it } from 'vitest';

import type { StoryEvent, StorylineChapter } from '../api/storyline';

import { povCharacters } from './povLanes';
import { timelineItems, undatedChapters } from './timeline';

/** A chapter with a sort value (or none) and a point of view (or none). */
function chapter(
  code: string,
  worldSort: number | null,
  pov: string | null = null,
): StorylineChapter {
  return {
    code,
    position: 0,
    title: code,
    status: 'draft',
    kind: 'chapter',
    planningStatus: 'idea',
    povCharacterId: pov,
    povIsNarrator: false,
    actId: null,
    wordCount: 0,
    wordTarget: null,
    worldDate: '',
    worldSort,
  };
}

/** An event at a sort value. */
function event(id: string, sortValue: number): StoryEvent {
  return { id, title: id, displayDate: '', sortValue, description: '' };
}

describe('timelineItems', () => {
  it('sorts events and dated chapters together by sort value, events first on a tie', () => {
    const items = timelineItems(
      [chapter('c1', 2055.3), chapter('c2', null), chapter('c3', 2054)],
      [event('war', 2054), event('peace', 2056)],
    );
    expect(
      items.map((item) => (item.type === 'event' ? item.event.id : item.chapter.code)),
    ).toEqual(['war', 'c3', 'c1', 'peace']);
  });

  it('lists the chapters with no sort value apart, in book order', () => {
    expect(
      undatedChapters([chapter('a', null), chapter('b', 1), chapter('c', null)]).map(
        (each) => each.code,
      ),
    ).toEqual(['a', 'c']);
  });
});

describe('povCharacters', () => {
  it('keeps only the characters who tell a chapter, in the cast’s order', () => {
    const cast = [{ id: 'ana' }, { id: 'bogdan' }, { id: 'cora' }];
    expect(
      povCharacters(cast, [
        chapter('a', null, 'cora'),
        chapter('b', null, 'ana'),
        chapter('c', null),
      ]),
    ).toEqual([{ id: 'ana' }, { id: 'cora' }]);
  });
});
