/**
 * RisingWritersShelf: "Writers to follow this week" on Discover (story S1-E5-11, bundle LOOK-4c;
 * board Discover, shelf 3). Shown where the word "writers" sits in the discover_shelves setting.
 *
 * One scrolling line of at most 20 writer cards, with the shared Shelf's arrows and fades
 * (CLAUDE.md rule 20). No See all page: the list never holds more than 20. Hidden while it loads,
 * when it fails and when nobody may be suggested, so Discover never shows an empty shelf.
 * Who shows it: DiscoverPage (ShelfFromSetting). What it calls: useRisingWriters.
 */
import { Shelf } from '@/components/ui/Shelf';

import { useRisingWriters } from '../hooks/useRisingWriters';
import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

import { WriterToFollowCard } from './WriterToFollowCard';

/**
 * Renders the shelf, or nothing.
 *
 * @returns the shelf section or null
 */
export function RisingWritersShelf() {
  const { t } = useDiscoveryTranslation();
  const { writers } = useRisingWriters();
  if (writers.length === 0) return null;
  return (
    <Shelf
      eyebrow={t('writersToFollow.eyebrow')}
      title={t('writersToFollow.title')}
      items={writers.map((writer) => ({
        key: writer.handle,
        content: <WriterToFollowCard writer={writer} />,
      }))}
    />
  );
}
