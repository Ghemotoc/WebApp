/**
 * heroActivity: what happened this week, for the lines under the Home hero's buttons (board A01:
 * "3 new comments on chapters", "12 new followers this week", "teo_ink posted a new chapter").
 *
 * A pure function, so the counting is tested without a browser. It reads only the notifications
 * the person already has (the first page, newest first), so nothing new is stored or shown to
 * anyone else.
 * Who calls it: HubHeroActivity. What it calls: nothing.
 */
import type { AppNotification } from '@/features/notifications/api/notifications';

/** How far back the lines look: one week, as the board says "this week". */
const weekInMilliseconds = 7 * 24 * 60 * 60 * 1000;

/** The three lines' numbers and the writer who posted last; zero or null hides a line. */
export interface HeroActivity {
  /** Comments on the person's chapters this week (a grouped notification counts each actor). */
  comments: number;
  /** People who started following the person this week. */
  followers: number;
  /** The name of the writer whose new chapter came last this week, or null. */
  latestChapterWriter: string | null;
}

/**
 * Counts this week's comments and followers and finds the latest new chapter.
 *
 * @param notifications - the person's notifications, newest first
 * @param now - today, passed in so tests can fix the date
 * @returns the activity; every part is 0 or null when nothing happened
 */
export function heroActivity(notifications: AppNotification[], now: Date): HeroActivity {
  // Step 1: keep only the last seven days.
  const weekStart = now.getTime() - weekInMilliseconds;
  const thisWeek = notifications.filter((item) => new Date(item.at).getTime() >= weekStart);
  // Step 2: a grouped notification ("Ana and 2 others commented") counts every person in it.
  const countOf = (kind: AppNotification['kind']) =>
    thisWeek
      .filter((item) => item.kind === kind)
      .reduce((total, item) => total + Math.max(item.actorCount, 1), 0);
  // Step 3: the newest new-chapter notification names its writer (the list is newest first).
  const latestChapter = thisWeek.find((item) => item.kind === 'new_chapter') ?? null;
  const writer = latestChapter?.actors[0]?.displayName ?? null;
  return {
    comments: countOf('comment_on_chapter'),
    followers: countOf('new_follower'),
    latestChapterWriter: writer,
  };
}
