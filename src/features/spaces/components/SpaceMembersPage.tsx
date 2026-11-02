/**
 * SpaceMembersPage: "Members", at /spaces/:spaceSlug/members: everyone in the space, the owner
 * first, then the moderators with their powers, then the members by when they joined, each with
 * "Remove" where the reader may use it (bundle FORUMS-2, part b; story S1-E8-07: the members
 * power).
 *
 * Who shows it: the router; "Members" on the space's header links here, for the owner, moderators
 * with the members power and our moderation team. Anyone else is told they can't manage members;
 * the database checks again (space_member_list(), remove_space_member()).
 * What it calls: useSpace → space_page(); useSpaceMembers → space_member_list();
 * useRemoveSpaceMember → remove_space_member(); SpaceMemberRow.
 */
import { useState } from 'react';
import { useParams } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import type { Space } from '../api/spaces';
import { useRemoveSpaceMember, useSpaceMembers } from '../hooks/useSpaceModeration';
import { useSpace } from '../hooks/useSpaces';
import { spaceFailureText } from '../lib/spaceFailures';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { SpaceBreadcrumb } from './SpaceBreadcrumb';
import { SpaceFormCard } from './SpaceFormCard';
import { SpaceMemberRow } from './SpaceMemberRow';
import { SpaceNotFound } from './SpaceNotFound';

/**
 * The list, for someone holding the members power.
 *
 * @param props.space - the space
 * @returns the card with the members
 */
function MemberList({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  const members = useSpaceMembers(space.slug, true);
  const removing = useRemoveSpaceMember(space.slug);
  const [lastName, setLastName] = useState('');

  /** Sends a removal and remembers whose it was, for the message. Errors show above the list. */
  async function remove(handle: string, name: string, reason: string): Promise<boolean> {
    setLastName(name);
    try {
      await removing.run({ handle, reason });
      return true;
    } catch {
      return false;
    }
  }

  const list = members.data ?? [];
  return (
    <SpaceFormCard eyebrow={space.name} title={t('members.title')} intro={t('members.intro')}>
      <p aria-live="polite" className="m-0 text-sm text-body">
        {removing.isDone && t('members.removed', { name: lastName })}
      </p>
      {removing.failure !== null && (
        <Notice tone="error">{t(...spaceFailureText(removing.failure))}</Notice>
      )}
      {members.isError && <Notice tone="error">{t('members.loadFailed')}</Notice>}
      {list.length > 0 && (
        <ul className="m-0 list-none p-0">
          {list.map((member) => (
            <SpaceMemberRow
              key={member.person?.handle ?? member.joinedAt}
              member={member}
              mayRemoveModerators={space.viewer.canAppoint}
              onRemove={remove}
              isRunning={removing.isRunning}
            />
          ))}
        </ul>
      )}
    </SpaceFormCard>
  );
}

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
  return (
    <PageContainer className="flex flex-col gap-6 py-10">
      {read.isError && <Notice tone="error">{t('space.loadFailed')}</Notice>}
      {space === null && <SpaceNotFound />}
      {space !== undefined && space !== null && (
        <>
          <SpaceBreadcrumb space={space} current={t('members.title')} />
          {space.viewer.powers.includes('members') ? (
            <MemberList space={space} />
          ) : (
            <Notice tone="info">{t('members.notAllowed')}</Notice>
          )}
        </>
      )}
    </PageContainer>
  );
}
