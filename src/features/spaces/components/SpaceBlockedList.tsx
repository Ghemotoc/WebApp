/**
 * SpaceBlockedList: "Blocked", under a space's members: the people the space blocked, each with
 * "Unblock" (bundle BOOKS-7, board F11, user story 7.11: "they can ask to join again unless they
 * are blocked"). The board draws only the "Block" choice; this list is how a block is undone,
 * noted in docs/board-fixes.md.
 *
 * Who shows it: SpaceMembersPage, for whoever holds the members power; it shows nothing while
 * nobody is blocked. What it calls: useBlockedMembers → space_blocked_members();
 * useUnblockSpaceMember → unblock_space_member().
 */
import { Button } from '@/components/ui/Button';
import { MetaLine } from '@/components/ui/MetaLine';
import { Notice } from '@/components/ui/Notice';
import { PersonAvatar } from '@/features/avatars/components/PersonAvatar';
import { threadDay } from '@/features/forums/lib/forumDates';
import { nameOf } from '@/features/forums/lib/forumPeople';
import { errorShownByHook } from '@/lib/errorShownByHook';

import type { SpaceBlockedPerson } from '../api/spaceBlocks';
import type { Space } from '../api/spaces';
import { useBlockedMembers, useUnblockSpaceMember } from '../hooks/useSpaceBlocks';
import { spaceFailureText } from '../lib/spaceFailures';
import { useSpacesTranslation } from '../registerSpacesTranslations';

/**
 * One blocked person and "Unblock".
 *
 * @param props.entry - the person and when they were blocked
 * @param props.onUnblock - lifts the block
 * @param props.isRunning - whether an unblock is being sent
 * @returns a list item
 */
function BlockedRow({
  entry,
  onUnblock,
  isRunning,
}: {
  entry: SpaceBlockedPerson;
  onUnblock: (handle: string) => void;
  isRunning: boolean;
}) {
  const { t, i18n } = useSpacesTranslation();
  const name = nameOf(entry.person, t('row.ownerDeleted'));
  const handle = entry.person?.handle ?? null;
  const since = t('members.blockedOn', { date: threadDay(entry.blockedAt, i18n.language) });
  return (
    <li className="flex items-center gap-3 border-t border-border py-3">
      <PersonAvatar name={name} handle={handle} size="medium" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="type-label font-semibold break-words text-ink-heading">{name}</span>
        <MetaLine facts={[{ text: since }]} />
      </div>
      {handle !== null && (
        <Button
          variant="secondary"
          aria-label={t('members.unblockLabel', { name })}
          disabled={isRunning}
          onClick={() => onUnblock(handle)}
        >
          {t('members.unblock')}
        </Button>
      )}
    </li>
  );
}

/**
 * Renders the list.
 *
 * @param props.space - the space
 * @returns the section, or nothing while nobody is blocked
 */
export function SpaceBlockedList({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  const blocked = useBlockedMembers(space.slug, true);
  const unblocking = useUnblockSpaceMember(space.slug);
  const list = blocked.data ?? [];
  if (list.length === 0 && !unblocking.isDone && !blocked.isError) return null;
  return (
    <section aria-labelledby="space-blocked-heading" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2
          id="space-blocked-heading"
          className="m-0 font-heading type-heading font-bold text-ink-heading"
        >
          {t('members.blockedTitle')}
        </h2>
        <p className="m-0 type-meta text-ink-muted">{t('members.blockedIntro')}</p>
      </div>
      <p aria-live="polite" className="m-0 type-body text-ink-muted empty:hidden">
        {unblocking.isDone ? t('members.unblocked') : ''}
      </p>
      {blocked.isError && <Notice tone="error">{t('members.loadFailed')}</Notice>}
      {unblocking.failure !== null && (
        <Notice tone="error">{t(...spaceFailureText(unblocking.failure))}</Notice>
      )}
      {list.length > 0 && (
        <ul className="m-0 max-w-[640px] list-none border-b border-border p-0">
          {list.map((entry) => (
            <BlockedRow
              key={entry.person?.handle ?? entry.blockedAt}
              entry={entry}
              onUnblock={(handle) => void unblocking.run(handle).catch(errorShownByHook)}
              isRunning={unblocking.isRunning}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
