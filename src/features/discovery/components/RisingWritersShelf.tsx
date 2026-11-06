/**
 * RisingWritersShelf: "Writers to follow this week" on Discover (story S1-E5-11, bundle LOOK-4c;
 * board Discover, shelf 3). Shown where the word "writers" sits in the discover_shelves setting.
 *
 * One scrolling line of at most 20 writer cards, with the shared Shelf's arrows and fades
 * (CLAUDE.md rule 20). No See all page: the list never holds more than 20. Hidden while it loads,
 * when it fails and when nobody may be suggested, so Discover never shows an empty shelf.
 * Who shows it: DiscoverPage (ShelfFromSetting), and the home page as "New and rising writers"
 * (LOOK-3, with place "home"). What it calls: useRisingWriters.
 */
import { Shelf } from '@/components/ui/Shelf';

import { useRisingWriters } from '../hooks/useRisingWriters';
import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

import { WriterToFollowCard } from './WriterToFollowCard';

/**
 * Renders the shelf, or nothing.
 *
 * @param props.place - discover ("Writers to follow this week") or home ("New and rising
 *   writers", board Website-Home)
 * @param props.anchorId - the section's id on the home page ("#writers")
 * @returns the shelf section or null
 */
export function RisingWritersShelf({
  place = 'discover',
  anchorId,
}: {
  place?: 'discover' | 'home';
  anchorId?: string;
}) {
  const { t } = useDiscoveryTranslation();
  const { writers } = useRisingWriters();
  if (writers.length === 0) return null;
  const words = place === 'home' ? 'risingWriters' : 'writersToFollow';
  return (
    <Shelf
      anchorId={anchorId}
      eyebrow={t(`${words}.eyebrow`)}
      title={t(`${words}.title`)}
      items={writers.map((writer) => ({
        key: writer.handle,
        content: <WriterToFollowCard writer={writer} />,
      }))}
    />
  );
}
