/**
 * PopularShelf: Discover's Popular shelf with its "Popular in" drop-down (bundle MARKETS-2, part
 * d; Robert, 8 Nov 2026).
 *
 * It starts on the reader's own country (usePopularIn). Picking another re-sorts the shelf; its
 * "View more" card opens the Popular See all page on the same country.
 * Who uses it: DiscoverPage, for the "popular" word of the discover_shelves setting.
 * What it calls: DiscoverShelf, PopularInSelect, PopularInNote, useStoryShelf.
 */
import { useState } from 'react';

import type { ListRequest } from '../api/storyLists';
import { useStartingPopularIn } from '../hooks/usePopularIn';
import { useStoryShelf } from '../hooks/useStoryShelf';
import { plainList } from '../lib/listAddresses';
import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

import { DiscoverShelf } from './DiscoverShelf';
import { PopularInNote } from './PopularInNote';
import { PopularInSelect } from './PopularInSelect';

/**
 * The drop-down and the note above the row.
 *
 * @returns the toolbar
 */
function PopularToolbar({
  request,
  onChange,
}: {
  request: ListRequest;
  onChange: (country: string) => void;
}) {
  // The same cached list as the shelf, so this asks the server for nothing more.
  const { shelf } = useStoryShelf(request);
  return (
    <div className="flex flex-col gap-2">
      <PopularInSelect
        id="discover-popular-in"
        value={request.popularIn ?? ''}
        onChange={onChange}
      />
      <PopularInNote request={request} rankedCountry={shelf?.popularIn} />
    </div>
  );
}

/**
 * Renders the shelf, once the starting country is known.
 *
 * @returns the shelf, or nothing while the reader's country loads
 */
export function PopularShelf() {
  const { t } = useDiscoveryTranslation();
  const starting = useStartingPopularIn();
  // The reader's pick on this page; until they pick, the starting country.
  const [picked, setPicked] = useState<string | null>(null);
  const country = picked ?? starting;
  if (country === null) return null;
  const request: ListRequest = { ...plainList('popular'), popularIn: country };
  return (
    <DiscoverShelf
      eyebrow={t('lists.popularEyebrow')}
      title={t('lists.popular')}
      request={request}
      toolbar={<PopularToolbar request={request} onChange={setPicked} />}
    />
  );
}
