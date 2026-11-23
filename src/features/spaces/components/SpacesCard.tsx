/**
 * SpacesCard: the forum index's "Spaces" card: the four spaces with the latest activity,
 * "Create a space" and "See all 12 spaces" (bundle FORUMS-2, part a; S1-E8-06; board 5.1's
 * aside).
 * Since CALM-7c (board simplified/New-Together) it sits on the page, not on a card: "Run by
 * members" as a meta line over the subheading, the intro, hairline rows, then "Create a space"
 * (quiet), "Join a class" and "See 37 spaces" (text buttons).
 * Who shows it: the forums' ForumsPage and ForumPage, beside the categories. What it calls:
 * useSpaceList.
 */
import { Link } from 'react-router';

import { buttonClassName } from '@/components/ui/buttonStyles';
import { Notice } from '@/components/ui/Notice';

import { useSpaceList } from '../hooks/useSpaces';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { SpaceRow } from './SpaceRow';

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
        <ul className="m-0 list-none p-0">
          {list.spaces.slice(0, cardSize).map((space) => (
            <SpaceRow key={space.id} space={space} isCompact />
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
