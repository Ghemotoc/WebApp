/**
 * SpaceLogPage: "Moderation log", at /spaces/:spaceSlug/log: every action taken in the space by
 * its owner, its moderators and our moderation team, newest first, 50 at a time (bundle FORUMS-2,
 * part b; story S1-E8-07 criterion 2: "all space moderator actions are logged and visible to the
 * space owner and platform moderators"). Bundle BOOKS-7 draws it as board F12: the row of the
 * space's pages, a "Who" drop-down and a table, "Show 50 older" under it.
 *
 * Our moderation team shows as "The moderation team", never by name. Who shows it: the router;
 * "Moderation log" on the space's header and in the row of its pages links here, for the owner and
 * our moderation team. Anyone else is told the log is the owner's; the database checks again
 * (space_log()). What it calls: useSpace → space_page(); useSpaceLog → space_log();
 * SpaceToolsHeader, SpaceLogWhoSelect and SpaceLogTable.
 */
import { useState } from 'react';
import { useParams } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import type { Space } from '../api/spaces';
import { useSpaceLog } from '../hooks/useSpaceModeration';
import { useSpace } from '../hooks/useSpaces';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { SpaceLogTable } from './SpaceLogTable';
import { SpaceLogWhoSelect } from './SpaceLogWhoSelect';
import { SpaceNotFound } from './SpaceNotFound';
import { SpaceToolsHeader } from './SpaceToolsHeader';

/**
 * The log, for the owner and our moderation team.
 *
 * @param props.space - the space
 * @returns the Who drop-down, the table and "Show 50 older"
 */
function LogList({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  // '' is anyone; a username or 'platform' asks space_log() for that one's actions only.
  const [who, setWho] = useState('');
  const log = useSpaceLog(space.slug, true, who === '' ? null : who);
  return (
    <div className="flex flex-col gap-4">
      <SpaceLogWhoSelect
        people={log.people}
        platformActed={log.platformActed}
        value={who}
        onChange={setWho}
      />
      {log.loadFailed && <Notice tone="error">{t('log.loadFailed')}</Notice>}
      {log.entries !== null && log.entries.length === 0 && (
        <p className="m-0 type-body text-ink-muted">{t('log.empty')}</p>
      )}
      {log.entries !== null && log.entries.length > 0 && (
        <SpaceLogTable entries={log.entries} space={space} />
      )}
      {log.hasMore && (
        <button
          type="button"
          className="h-11 w-full rounded-full button-glass px-6 type-label font-semibold"
          disabled={log.isLoadingMore}
          onClick={log.showMore}
        >
          {t('log.showMore')}
        </button>
      )}
    </div>
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
    <PageContainer className="flex flex-col gap-12 pt-8 pb-20">
      {read.isError && <Notice tone="error">{t('space.loadFailed')}</Notice>}
      {space === null && <SpaceNotFound />}
      {space !== undefined && space !== null && (
        <>
          <SpaceToolsHeader space={space} title={t('log.title')} intro={t('log.intro')} />
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
