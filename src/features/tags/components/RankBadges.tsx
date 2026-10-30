/**
 * RankBadges: where a story stands in its tags, under its cover on the story page ("#4 in
 * Fantasy"; CMS-1g, Robert, 30 Oct 2026, 10:44 to 10:48).
 *
 * The cover shows the story's 3 best ranks, or the 3 its writer picked. Ranks use the tag page's
 * popular order and count only the stories this reader may see, so the number always matches the
 * tag page. Each badge is an information pill (DoD pill system): it tells, it doesn't do, so it is
 * not a link; the tag chips further down open the tag pages.
 * Who shows it: StoryHeader. What it calls: useTagRanks() and useTagCatalogue() for the tag's
 * name in the interface language. Shows nothing while loading, on an error or with no rank.
 */
import { useTranslation } from 'react-i18next';

import { InfoPill } from '@/components/ui/InfoPill';

import { useTagCatalogue } from '../hooks/useTagCatalogue';
import { useTagRanks } from '../hooks/useTagRanks';

/**
 * Renders the badges.
 *
 * @param props.slug - the story's public address
 * @returns the labelled list, or nothing
 */
export function RankBadges({ slug }: { slug: string }) {
  const { t } = useTranslation('reading');
  const { showTag } = useTagCatalogue();
  const ranks = useTagRanks(slug);
  // Step 1: only the ranks the cover shows, best first (the database already chose them).
  const badges = (ranks.data ?? []).filter((entry) => entry.isBadge);
  if (badges.length === 0) return null;
  badges.sort((first, second) => (first.rank ?? 0) - (second.rank ?? 0));
  // Step 2: one pill each; a screen reader also hears how many stories the tag holds.
  return (
    <ul aria-label={t('storyPage.rankBadges')} className="m-0 flex list-none flex-wrap gap-1.5 p-0">
      {badges.map((badge) => (
        <li key={badge.tagName}>
          <InfoPill tone="gold">
            {t('storyPage.rankBadge', { rank: badge.rank, tag: showTag(badge.tagName) })}
            <span className="sr-only">
              {' '}
              {t('storyPage.rankBadgeOutOf', { count: badge.outOf ?? 0 })}
            </span>
          </InfoPill>
        </li>
      ))}
    </ul>
  );
}
