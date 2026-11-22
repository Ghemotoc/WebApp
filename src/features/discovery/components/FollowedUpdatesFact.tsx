/**
 * FollowedUpdatesFact: "Writers you follow updated 6 stories this week" in the Read page's meta
 * line (bundle CALM-7c; board New-Read, the line under the title).
 *
 * The board counts updates; the page has the list of stories by writers the reader follows, so it
 * counts the stories among them with a chapter out in the last seven days and says "stories", which
 * is what it can prove. It reads the same cached list as the "New from writers you follow" shelf,
 * so it asks the server for nothing more. With nothing new it shows nothing.
 * Who shows it: ReadHeader, only for someone signed in. What it calls: useStoryShelf
 * (browse_stories('following')) and lib/recentUpdates.
 */
import { useStoryShelf } from '../hooks/useStoryShelf';
import { plainList } from '../lib/listAddresses';
import { storiesUpdatedThisWeek } from '../lib/recentUpdates';
import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

/**
 * Renders the fact, or nothing while loading or when nothing is new.
 *
 * @returns the list item or null
 */
export function FollowedUpdatesFact() {
  const { t } = useDiscoveryTranslation();
  const { shelf } = useStoryShelf(plainList('following'));
  // Step 1: nothing while the list loads.
  if (shelf === null) return null;
  // Step 2: count the stories with a chapter out this week; none means no fact at all.
  const count = storiesUpdatedThisWeek(shelf.stories);
  if (count === 0) return null;
  return <li>{t('discover.followedUpdates', { count })}</li>;
}
