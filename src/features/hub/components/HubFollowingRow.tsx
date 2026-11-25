/**
 * HubFollowingRow: "New from writers you follow" on the Home page (bundle CALM-7c; board New-Home:
 * a row of covers, the full width since board A01 (story 1.1), with "Read" at the top right).
 *
 * The same list as the Read page's following row: stories by the writers and stories the member
 * follows, the most recently updated first. Hidden while it is empty, so a new member isn't shown
 * an empty row.
 * Who shows it: MemberHomePage. What it calls: useStoryShelf (the following list), Shelf and
 * ListedStoryCard.
 */
import { Link } from 'react-router';

import { designsForRow, resolveCoverChoice } from '@/components/covers/automaticCover';
import { buttonClassName } from '@/components/ui/buttonStyles';
import { Shelf } from '@/components/ui/Shelf';
import { ListedStoryCard } from '@/features/discovery/components/ListedStoryCard';
import { useStoryShelf } from '@/features/discovery/hooks/useStoryShelf';
import { listAddress, plainList } from '@/features/discovery/lib/listAddresses';

import { useHubTranslation } from '../registerHubTranslations';

/** The following list, asked for once so the request stays the same between renders. */
const followingList = plainList('following');

/**
 * Renders the row, or nothing while it loads or is empty.
 *
 * @returns the row's section or null
 */
export function HubFollowingRow() {
  const { t } = useHubTranslation();
  const { shelf: page } = useStoryShelf(followingList);
  if (page === null || page.stories.length === 0) return null;
  // Covers are worked out per row so neighbours never share a design (S1-E3-13).
  const covers = designsForRow(page.stories);
  return (
    <Shelf
      title={t('hub.following.heading')}
      seeAllHref={listAddress(followingList)}
      totalCount={page.total}
      items={page.stories.map((story, index) => ({
        key: story.slug,
        content: (
          <ListedStoryCard story={story} cover={covers[index] ?? resolveCoverChoice(story)} />
        ),
      }))}
      headerAction={
        <Link to="/discover" className={buttonClassName({ variant: 'text' })}>
          {t('hub.following.read')}
        </Link>
      }
    />
  );
}
