/**
 * SpacesMoreSection: "More spaces", every space the member may see and isn't in, never a class,
 * with the order drop-down (bundle BOOKS-7, board F06, user story 7.6).
 *
 * The line under the heading says which age group the member sees and the order ("Spaces for
 * members 16 and over, the latest activity first"); the database keeps under-16s to under-16
 * spaces and adults out of an under-16 space whose owner didn't open it to everybody
 * (space_card_visible()). Signed out, the line gives the order only. Each row ends with Join,
 * Ask to join or Asked; "Show 20 more" adds the next twenty.
 * Who shows it: SpacesPage. What it calls: useSpaceList → space_list(joined false), useMyAgeGroup
 * → my_space_age_group(); SpaceSortSelect and SpaceRow.
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import type { SpaceSort } from '../api/spaces';
import { useMyAgeGroup, useSpaceList } from '../hooks/useSpaces';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { SpaceRow } from './SpaceRow';
import { SpaceSortSelect } from './SpaceSortSelect';
import { spacesPageSize } from './SpacesJoinedSection';

/**
 * The heading, the line under it and the drop-down.
 *
 * @returns the section's head
 */
function MoreSpacesHead({ sort, onSort }: { sort: SpaceSort; onSort: (sort: SpaceSort) => void }) {
  const { t } = useSpacesTranslation();
  // The age group the database sorts the member into; null when signed out.
  const group = useMyAgeGroup().data ?? null;
  const lineGroup = group ?? 'anyone';
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <h2 id="spaces-more" className="m-0 type-heading font-heading font-bold text-ink-heading">
          {t('list.more')}
        </h2>
        <p className="m-0 type-meta text-ink-muted">{t(`list.line.${lineGroup}.${sort}`)}</p>
      </div>
      <SpaceSortSelect value={sort} onChange={onSort} />
    </div>
  );
}

/**
 * Renders the section.
 *
 * @returns the head, the rows and "Show 20 more"
 */
export function SpacesMoreSection() {
  const { t } = useSpacesTranslation();
  const [sort, setSort] = useState<SpaceSort>('latest');
  const list = useSpaceList(spacesPageSize, { sort, joined: false });
  return (
    <section aria-labelledby="spaces-more" className="flex flex-col gap-4">
      <MoreSpacesHead sort={sort} onSort={setSort} />
      {list.loadFailed && <Notice tone="error">{t('loadFailed')}</Notice>}
      {list.spaces !== null && list.spaces.length === 0 && (
        <p className="m-0 type-body text-ink-muted">{t('list.emptyMore')}</p>
      )}
      {list.spaces !== null && list.spaces.length > 0 && (
        <div className="flex flex-col gap-4">
          <ul aria-label={t('list.more')} className="m-0 list-none p-0">
            {list.spaces.map((space) => (
              <SpaceRow key={space.id} space={space} isJoinOffered />
            ))}
          </ul>
          {list.hasMore && (
            <Button variant="secondary" onClick={list.showMore} disabled={list.isLoadingMore}>
              {t('list.showMore', { count: spacesPageSize })}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
