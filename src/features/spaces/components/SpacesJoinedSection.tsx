/**
 * SpacesJoinedSection: "Joined", the spaces the member is in, class spaces included, at the top
 * of the Spaces page (bundle BOOKS-7, board F06, user story 7.6: "Joined first (with Class 9B for
 * its members)").
 *
 * Shown only to a signed-in member who is in at least one space; everyone else starts at "More
 * spaces". Latest activity first, 20 at a time.
 * Who shows it: SpacesPage. What it calls: useSpaceList → space_list(joined true); SpaceRow.
 */
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import { useSpaceList } from '../hooks/useSpaces';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { SpaceRow } from './SpaceRow';

/** How many spaces each "Show more" adds (user story 7.6). */
export const spacesPageSize = 20;

/**
 * Renders the section.
 *
 * @returns the heading and the rows, or nothing when the member is in no space
 */
export function SpacesJoinedSection() {
  const { t } = useSpacesTranslation();
  const list = useSpaceList(spacesPageSize, { sort: 'latest', joined: true });
  if (list.loadFailed) return <Notice tone="error">{t('loadFailed')}</Notice>;
  if (list.spaces === null || list.spaces.length === 0) return null;
  return (
    <section aria-labelledby="spaces-joined" className="flex flex-col gap-4">
      <h2 id="spaces-joined" className="m-0 type-heading font-heading font-bold text-ink-heading">
        {t('list.joined')}
      </h2>
      <div className="flex flex-col gap-4">
        <ul aria-label={t('list.joinedLabel')} className="m-0 list-none p-0">
          {list.spaces.map((space) => (
            <SpaceRow key={space.id} space={space} isJoinOffered={false} />
          ))}
        </ul>
        {list.hasMore && (
          <Button variant="secondary" onClick={list.showMore} disabled={list.isLoadingMore}>
            {t('list.showMore', { count: spacesPageSize })}
          </Button>
        )}
      </div>
    </section>
  );
}
