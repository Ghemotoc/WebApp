/**
 * SpaceMembersPage: "Members", at /spaces/:spaceSlug/members: the people waiting to join, then
 * everyone in the space, the owner first, then the moderators with their powers, then the members
 * by when they joined, each with what the reader may do to them, then anyone the space blocked
 * (bundle FORUMS-2, part b; story S1-E8-07: the members power; redrawn as board F11 in bundle
 * BOOKS-7, user stories 7.7, 7.10 and 7.11).
 *
 * Who shows it: the router; "Members" on the space's header and in the row of its pages links
 * here, for the owner, moderators with the members power and our moderation team. Anyone else is
 * told they can't manage members; the database checks again (space_member_list() and the rest).
 * What it calls: useSpace → space_page(); SpaceToolsHeader, SpaceRequestsCard, SpaceMembersList
 * and SpaceBlockedList.
 */
import { useParams } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import type { Space } from '../api/spaces';
import { useSpace } from '../hooks/useSpaces';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { SpaceBlockedList } from './SpaceBlockedList';
import { SpaceMembersList } from './SpaceMembersList';
import { SpaceNotFound } from './SpaceNotFound';
import { SpaceRequestsCard } from './SpaceRequestsCard';
import { SpaceToolsHeader } from './SpaceToolsHeader';

/**
 * Renders the page.
 *
 * @returns the members, "you can't manage members here" or a "not here" note
 */
export function SpaceMembersPage() {
  const { t } = useSpacesTranslation();
  const { spaceSlug = '' } = useParams();
  const read = useSpace(spaceSlug);
  const space = read.data;
  if (space === undefined || space === null) {
    return (
      <PageContainer className="flex flex-col gap-6 pt-8 pb-20">
        {read.isError && <Notice tone="error">{t('space.loadFailed')}</Notice>}
        {space === null && <SpaceNotFound />}
      </PageContainer>
    );
  }
  return (
    <PageContainer className="flex flex-col gap-16 pt-8 pb-20">
      <SpaceToolsHeader
        space={space}
        title={t('members.title')}
        intro={t('members.introCount', { count: space.memberCount })}
      />
      <MembersSections space={space} />
    </PageContainer>
  );
}

/**
 * The page's sections, for whoever holds the members power.
 *
 * @param props.space - the space
 * @returns waiting to join, the members and the blocked, or "you can't manage members here"
 */
function MembersSections({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  if (!space.viewer.powers.includes('members')) {
    return <Notice tone="info">{t('members.notAllowed')}</Notice>;
  }
  return (
    <>
      {/* Waiting to join shows only where each request is approved (user story 7.6). */}
      {space.joining === 'approve' && <SpaceRequestsCard space={space} isPlain />}
      <SpaceMembersList space={space} />
      <SpaceBlockedList space={space} />
    </>
  );
}
