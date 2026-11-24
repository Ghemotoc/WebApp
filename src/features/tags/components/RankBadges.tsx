/**
 * RankBadges: where a story stands, as one line of links on the story page ("#3 in mystery out of
 * 412 stories · #1 in set-in-romania out of 96 stories · #12 in Fiction"; CMS-1g, Robert,
 * 30 Oct 2026; redrawn to board B01 in bundle 2, user story 2.1).
 *
 * First the story's 3 best ranks in its tags, or the 3 its writer picked, each a link to the tag
 * page with "out of N stories" after it; then its place in its category (S1-E15-05, shown up to
 * place 100), a link to the category page. Ranks use the tag page's popular order and count only
 * the stories this reader may see, so the number always matches the tag page.
 * Who shows it: StoryHeader, under the numbers. What it calls: useTagRanks() → story_tag_ranks(),
 * useRankingPlace() → story_ranking_place(), and useTagCatalogue() for the tag's name in the
 * interface language. Shows nothing while loading, on an error or with no rank.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { listAddress, plainList } from '@/features/discovery/lib/listAddresses';
import { useRankingPlace } from '@/features/reading/hooks/useRankingPlace';

import { useTagCatalogue } from '../hooks/useTagCatalogue';
import { useTagRanks } from '../hooks/useTagRanks';

/** The links: underlined, at least 24 px tall (rule 9), tapped in a 44 by 32 box. */
const rankLink = 'hit-target text-link underline underline-offset-2';

/**
 * The tag ranks the story shows, best first.
 *
 * @returns the ranks, empty while loading or when there are none
 */
function useShownTagRanks(slug: string) {
  const ranks = useTagRanks(slug);
  const shown = (ranks.data ?? []).filter((entry) => entry.isBadge);
  shown.sort((first, second) => (first.rank ?? 0) - (second.rank ?? 0));
  return shown;
}

/**
 * Renders the line.
 *
 * @param props.slug - the story's public address
 * @returns the labelled list, or nothing
 */
export function RankBadges({ slug }: { slug: string }) {
  const { t } = useTranslation('reading');
  const { showTag } = useTagCatalogue();
  const tagRanks = useShownTagRanks(slug);
  const place = useRankingPlace(slug);
  if (tagRanks.length === 0 && place === null) return null;
  return (
    <ul
      aria-label={t('storyPage.rankBadges')}
      className="m-0 flex list-none flex-wrap items-baseline gap-x-2 p-0 type-body text-ink [&>li+li]:before:mr-2 [&>li+li]:before:content-['·']"
    >
      {/* Step 1: each tag rank, a link to the tag page, then how many stories the tag holds. */}
      {tagRanks.map((entry) => (
        <li key={entry.tagName}>
          <Link to={listAddress(plainList('tag', entry.tagName))} className={rankLink}>
            {t('storyPage.rankBadge', { rank: entry.rank, tag: showTag(entry.tagName) })}
          </Link>{' '}
          <span className="type-meta text-ink-muted">
            {t('storyPage.rankBadgeOutOf', { count: entry.outOf ?? 0 })}
          </span>
        </li>
      ))}
      {/* Step 2: the place in the category, a link to the category page. */}
      {place !== null && (
        <li>
          <Link to={listAddress(plainList('category', place.categorySlug))} className={rankLink}>
            {t('storyPage.rankingPlace', {
              place: place.place,
              category: t(`categories.${place.categorySlug}`, {
                ns: 'writing',
                defaultValue: place.categorySlug,
              }),
            })}
          </Link>
        </li>
      )}
    </ul>
  );
}
