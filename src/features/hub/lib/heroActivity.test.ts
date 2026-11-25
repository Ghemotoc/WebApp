/**
 * Tests for heroActivity: the lines under the Home hero's buttons (board A01; Robert's review of
 * 25 Nov 2026).
 */
import { describe, expect, it } from 'vitest';

import type { AppNotification } from '@/features/notifications/api/notifications';

import { heroActivity } from './heroActivity';

const now = new Date('2026-11-20T12:00:00Z');

/**
 * Builds a notification with only the fields heroActivity reads; the rest don't matter here.
 *
 * @param kind - the notification's kind
 * @param daysAgo - how long ago it came
 * @param actors - the people in it, newest first
 * @param actorCount - how many people the group holds
 * @returns the notification
 */
function notification(
  kind: AppNotification['kind'],
  daysAgo: number,
  actors: string[],
  actorCount = actors.length,
): AppNotification {
  const at = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
  const people = actors.map((name) => ({ handle: name, displayName: name }));
  return { kind, at, actors: people, actorCount } as unknown as AppNotification;
}

describe('heroActivity', () => {
  it('counts every commenter and follower in grouped notifications this week', () => {
    const activity = heroActivity(
      [
        notification('comment_on_chapter', 1, ['ana', 'dan'], 3),
        notification('new_follower', 2, ['ion'], 12),
      ],
      now,
    );
    expect(activity.comments).toBe(3);
    expect(activity.followers).toBe(12);
  });

  it('names the writer of the newest new chapter', () => {
    const activity = heroActivity(
      [notification('new_chapter', 0, ['teo_ink']), notification('new_chapter', 3, ['mara'])],
      now,
    );
    expect(activity.latestChapterWriter).toBe('teo_ink');
  });

  it('leaves out anything older than a week, so a quiet week shows no line', () => {
    const activity = heroActivity(
      [notification('comment_on_chapter', 8, ['ana']), notification('new_chapter', 9, ['mara'])],
      now,
    );
    expect(activity).toEqual({ comments: 0, followers: 0, latestChapterWriter: null });
  });
});
