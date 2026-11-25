/**
 * HubHeroActivity: the short lines under the Home hero's buttons (board A01): "3 new comments on
 * chapters", "12 new followers this week" and "teo_ink posted a new chapter".
 *
 * Each line shows only when it has something to say, and the whole list hides when the week was
 * quiet or the notifications can't be read (the bell already says when they fail). Each line
 * opens the notifications page, where the details are.
 * Who shows it: HubHero. What it calls: useNotifications (my_notifications()) and
 * lib/heroActivity.ts.
 */
import { Link } from 'react-router';

import { useNotifications } from '@/features/notifications/hooks/useNotifications';

import { heroActivity } from '../lib/heroActivity';
import { useHubTranslation } from '../registerHubTranslations';

/**
 * Renders the lines, or nothing when there are none.
 *
 * @param props.now - today, passed in so the page shares one date
 * @returns the list or null
 */
export function HubHeroActivity({ now }: { now: Date }) {
  const { t } = useHubTranslation();
  const { notifications } = useNotifications();
  const activity = heroActivity(notifications, now);
  // Step 1: one sentence for each part that happened this week.
  const lines: string[] = [];
  if (activity.comments > 0)
    lines.push(t('hub.home.activity.comments', { count: activity.comments }));
  if (activity.followers > 0) {
    lines.push(t('hub.home.activity.followers', { count: activity.followers }));
  }
  if (activity.latestChapterWriter !== null) {
    lines.push(t('hub.home.activity.newChapter', { name: activity.latestChapterWriter }));
  }
  if (lines.length === 0) return null;
  // Step 2: quiet meta-size links in a wrapping row, as the board draws them.
  return (
    <ul
      aria-label={t('hub.home.activity.label')}
      className="m-0 flex list-none flex-wrap gap-x-6 gap-y-1 p-0"
    >
      {lines.map((line) => (
        <li key={line}>
          <Link
            to="/notifications"
            className="inline-flex min-h-6 items-center type-meta text-ink-muted hover:underline"
          >
            {line}
          </Link>
        </li>
      ))}
    </ul>
  );
}
