/**
 * SpacesCard: the forum index's "Spaces" card: the four spaces with the latest activity,
 * "Create a space" and "See all 12 spaces" (bundle FORUMS-2, part a; S1-E8-06; board 5.1's
 * aside).
 * Who shows it: the forums' ForumsPage, beside the categories. What it calls: useSpaceList.
 */
import { Link } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';

import { useSpaceList } from '../hooks/useSpaces';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { SpaceRow } from './SpaceRow';

/** How many spaces the card shows. */
const cardSize = 4;

/** The link style the card's two links share. */
const cardLink = 'inline-flex min-h-6 items-center text-sm font-semibold text-link underline';

/**
 * Renders the card.
 *
 * @returns a section with the spaces and the two links
 */
export function SpacesCard() {
  const { t } = useSpacesTranslation();
  const list = useSpaceList(cardSize);
  return (
    <section
      aria-labelledby="spaces-card-heading"
      className="overflow-hidden rounded-card border border-border bg-surface"
    >
      <div className="flex flex-col gap-1 border-b border-border px-5 py-4 md:px-6">
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <h2 id="spaces-card-heading" className="m-0 font-heading text-xl font-bold text-heading">
          {t('title')}
        </h2>
        <p className="m-0 text-sm text-body">{t('intro')}</p>
      </div>
      {list.loadFailed && (
        <div className="p-4">
          <Notice tone="error">{t('loadFailed')}</Notice>
        </div>
      )}
      {list.spaces !== null && list.spaces.length === 0 && (
        <p className="m-0 px-5 py-4 text-sm text-body md:px-6">{t('empty')}</p>
      )}
      {list.spaces !== null && list.spaces.length > 0 && (
        <ul className="m-0 list-none p-0">
          {list.spaces.slice(0, cardSize).map((space) => (
            <SpaceRow key={space.id} space={space} isCompact />
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 md:px-6">
        <div className="flex flex-wrap items-center gap-4">
          <Link to="/spaces/new" className={cardLink}>
            {t('create')}
          </Link>
          {/* Board ClassSpace: students type their teacher's code in Forums › Join a class. */}
          <Link to="/class" className={cardLink}>
            {t('joinClassLink')}
          </Link>
        </div>
        {list.total > 0 && (
          <Link to="/spaces" className={cardLink}>
            {t('seeAll', { count: list.total })}
          </Link>
        )}
      </div>
    </section>
  );
}
