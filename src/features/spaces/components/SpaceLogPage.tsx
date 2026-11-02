/**
 * SpaceLogPage: "Moderation log", at /spaces/:spaceSlug/log: every action taken in the space by
 * its owner, its moderators and our moderation team, newest first, 50 at a time (bundle FORUMS-2,
 * part b; story S1-E8-07 criterion 2: "all space moderator actions are logged and visible to the
 * space owner and platform moderators").
 *
 * Our moderation team shows as "The moderation team", never by name. Who shows it: the router;
 * "Moderation log" on the space's header links here, for the owner and our moderation team.
 * Anyone else is told the log is the owner's; the database checks again (space_log()).
 * What it calls: useSpace → space_page(); useSpaceLog → space_log(); SpaceLogLine.
 */
import { useParams } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import type { Space } from '../api/spaces';
import { useSpaceLog } from '../hooks/useSpaceModeration';
import { useSpace } from '../hooks/useSpaces';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { SpaceBreadcrumb } from './SpaceBreadcrumb';
import { SpaceFormCard } from './SpaceFormCard';
import { SpaceLogLine } from './SpaceLogLine';
import { SpaceNotFound } from './SpaceNotFound';

/**
 * The log, for the owner and our moderation team.
 *
 * @param props.space - the space
 * @returns the card with the lines and "Show more"
 */
function LogList({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  const log = useSpaceLog(space.slug, true);
  return (
    <SpaceFormCard eyebrow={space.name} title={t('log.title')} intro={t('log.intro')}>
      {log.loadFailed && <Notice tone="error">{t('log.loadFailed')}</Notice>}
      {log.entries !== null && log.entries.length === 0 && (
        <p className="m-0 text-sm text-body">{t('log.empty')}</p>
      )}
      {log.entries !== null && log.entries.length > 0 && (
        <ol className="m-0 list-none p-0">
          {log.entries.map((entry, position) => (
            <SpaceLogLine key={`${entry.createdAt}-${position}`} entry={entry} space={space} />
          ))}
        </ol>
      )}
      {log.hasMore && (
        <div>
          <Button variant="secondary" disabled={log.isLoadingMore} onClick={log.showMore}>
            {t('log.showMore')}
          </Button>
        </div>
      )}
    </SpaceFormCard>
  );
}

/**
 * Renders the page.
 *
 * @returns the log, "only the owner" or a "not here" note
 */
export function SpaceLogPage() {
  const { t } = useSpacesTranslation();
  const { spaceSlug = '' } = useParams();
  const read = useSpace(spaceSlug);
  const space = read.data;
  return (
    <PageContainer className="flex flex-col gap-6 py-10">
      {read.isError && <Notice tone="error">{t('space.loadFailed')}</Notice>}
      {space === null && <SpaceNotFound />}
      {space !== undefined && space !== null && (
        <>
          <SpaceBreadcrumb space={space} current={t('log.title')} />
          {space.viewer.canReadLog ? (
            <LogList space={space} />
          ) : (
            <Notice tone="info">{t('log.notAllowed')}</Notice>
          )}
        </>
      )}
    </PageContainer>
  );
}
