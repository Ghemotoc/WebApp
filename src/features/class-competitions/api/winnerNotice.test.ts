/**
 * Unit tests for winnerNoticeFrom(): how the "You're the winner" notice is read from the database
 * (bundle BOOKS-8, part 8c; board G13, user story 8.13).
 */
import { describe, expect, it } from 'vitest';

import { winnerNoticeFrom } from './winnerNotice';

describe('winnerNoticeFrom', () => {
  it('reads the competition, the teacher, the pen name and the winning chapter', () => {
    const notice = winnerNoticeFrom({
      competition_id: 'c1',
      name: 'Autumn short story contest',
      teacher_name: 'Ms Ionescu',
      winner_name: 'Lia Scrie',
      story_title: 'The Bell at Number 9',
      story_slug: 'the-bell',
      chapter_code: 'ab12',
    });
    expect(notice).toEqual({
      competitionId: 'c1',
      name: 'Autumn short story contest',
      teacherName: 'Ms Ionescu',
      winnerName: 'Lia Scrie',
      winningChapter: {
        storyTitle: 'The Bell at Number 9',
        storySlug: 'the-bell',
        chapterCode: 'ab12',
      },
    });
  });

  it('leaves the chapter out when it was deleted, so "Read the chapter again" never breaks', () => {
    const notice = winnerNoticeFrom({ competition_id: 'c1', name: 'Contest', story_slug: null });
    expect(notice?.winningChapter).toBeNull();
  });

  it('answers null when there is no notice to show', () => {
    expect(winnerNoticeFrom(null)).toBeNull();
    expect(winnerNoticeFrom({})).toBeNull();
  });
});
