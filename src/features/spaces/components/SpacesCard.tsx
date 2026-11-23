/**
 * SpacesCard: the forum index's "Spaces" card: the four spaces with the latest activity,
 * "Create a space" and "See all 12 spaces" (bundle FORUMS-2, part a; S1-E8-06; board 5.1's
 * aside).
 * Since CALM-7c (board simplified/New-Together) it sits on the page, not on a card: "Run by
 * members" as a meta line over the subheading, the intro, the spaces, then "Create a space"
 * (quiet), "Join a class" and "See 37 spaces" (text buttons).
 * Since CALM-9 (board F01, 23 Nov 2026) each space is a cover card (SpaceCoverCard): one a row in
 * the side column and on phones, two a row on tablets.
 * Who shows it: the forums' ForumsPage and ForumPage, beside the categories. What it calls:
 * useSpaceList and SpaceCoverCard.
 */
import { Link } from 'react-router';

import { buttonClassName } from '@/components/ui/buttonStyles';
import { Notice } from '@/components/ui/Notice';

import { useSpaceList } from '../hooks/useSpaces';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { SpaceCoverCard } from './SpaceCoverCard';

/** How many spaces the card shows. */
const cardSize = 4;

/** The look of the two text links under the rows. */
const textLink = buttonClassName({ variant: 'text' });

/**
 * Renders the card.
 *
 * @returns a section with the spaces and the two links
 */
export function SpacesCard() {
  const { t } = useSpacesTranslation();
  const list = useSpaceList(cardSize);
  return (
    <section aria-labelledby="spaces-card-heading" className="flex flex-col">
      <p className="m-0 type-meta">{t('eyebrow')}</p>
      <h2 id="spaces-card-heading" className="m-0 mt-1 mb-2 type-subheading">
        {t('title')}
      </h2>
      <p className="m-0 mb-1 text-ink-muted">{t('intro')}</p>
      {list.loadFailed && <Notice tone="error">{t('loadFailed')}</Notice>}
      {list.spaces !== null && list.spaces.length === 0 && (
        <p className="m-0 text-ink-muted">{t('empty')}</p>
      )}
      {list.spaces !== null && list.spaces.length > 0 && (
        // Board F01: one card a row in the side column and on phones, two a row on tablets.
        <ul
          aria-label={t('title')}
          className="m-0 mt-2 grid list-none gap-3 p-0 md:grid-cols-2 min-[900px]:grid-cols-1"
        >
          {list.spaces.slice(0, cardSize).map((space) => (
            <SpaceCoverCard key={space.id} space={space} />
          ))}
        </ul>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1">
        <Link to="/spaces/new" className={buttonClassName({ variant: 'secondary' })}>
          {t('create')}
        </Link>
        {/* Board ClassSpace: students type their teacher's code in Forums › Join a class. */}
        <Link to="/class" className={textLink}>
          {t('joinClassLink')}
        </Link>
        {list.total > 0 && (
          <Link to="/spaces" className={textLink}>
            {t('seeAll', { count: list.total })}
          </Link>
        )}
      </div>
    </section>
  );
}
