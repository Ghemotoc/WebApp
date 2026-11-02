/**
 * SpaceRequestsCard: "Requests to join" for the space's owner, each with Approve and Decline
 * (bundle FORUMS-2, part a; S1-E8-06 criterion 3: "the owner approves each request").
 *
 * The answer is said in a polite live region ("ilinca.r is in."). Someone who turned 16 while
 * waiting can't join an under-16 space any more, so their request is removed and the owner is
 * told why (criterion 6). Only the owner sees the card; the database checks again.
 * Who shows it: SpacePage, for the owner of a space where they approve each request.
 * What it calls: useJoinRequests → space_join_requests(); useDecideJoinRequest →
 * decide_space_join_request().
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import type { ForumPerson } from '@/features/forums/api/forumThreads';
import { threadDay } from '@/features/forums/lib/forumDates';
import { nameOf } from '@/features/forums/lib/forumPeople';

import type { JoinRequestOutcome, Space, SpaceJoinRequest } from '../api/spaces';
import { useDecideJoinRequest, useJoinRequests } from '../hooks/useSpaces';
import { spaceFailureText } from '../lib/spaceFailures';
import { useSpacesTranslation } from '../registerSpacesTranslations';

/** The words for each outcome. */
const outcomeKeys: Record<JoinRequestOutcome, string> = {
  approved: 'requests.approved',
  declined: 'requests.declined',
  age_changed: 'requests.ageChanged',
};

/**
 * One request: the person, when they asked, and the two buttons.
 *
 * @returns a list item
 */
function RequestRow({
  request,
  onDecide,
  isRunning,
}: {
  request: SpaceJoinRequest;
  onDecide: (person: ForumPerson, approve: boolean) => void;
  isRunning: boolean;
}) {
  const { t, i18n } = useSpacesTranslation();
  const name = nameOf(request.person, t('row.ownerDeleted'));
  return (
    <li className="flex flex-col gap-2 border-b border-border py-3 last:border-b-0">
      <span className="text-sm font-semibold break-words text-heading">{name}</span>
      <span className="text-[13px] text-meta">
        {t('requests.asked', { date: threadDay(request.requestedAt, i18n.language) })}
      </span>
      <div className="flex flex-wrap gap-2">
        <Button
          aria-label={t('requests.approveLabel', { name })}
          disabled={isRunning}
          onClick={() => onDecide(request.person, true)}
        >
          {t('requests.approve')}
        </Button>
        <Button
          variant="secondary"
          aria-label={t('requests.declineLabel', { name })}
          disabled={isRunning}
          onClick={() => onDecide(request.person, false)}
        >
          {t('requests.decline')}
        </Button>
      </div>
    </li>
  );
}

/**
 * Renders the card.
 *
 * @param props.space - the space
 * @returns the section with the requests, or nothing for anyone but the owner
 */
export function SpaceRequestsCard({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  const isOwner = space.viewer.canManage;
  const requests = useJoinRequests(space.slug, isOwner);
  const deciding = useDecideJoinRequest(space.slug);
  const [lastName, setLastName] = useState('');
  if (!isOwner) return null;

  /** Sends the owner's answer and remembers whose it was, for the message. */
  function decide(person: ForumPerson, approve: boolean) {
    if (person === null) return;
    setLastName(person.displayName);
    void deciding.run({ handle: person.handle, approve }).catch(() => undefined);
  }

  const list = requests.data ?? [];
  return (
    <section
      aria-labelledby="space-requests-heading"
      className="flex flex-col gap-2 rounded-card border border-border bg-surface px-6 py-5"
    >
      <h2 id="space-requests-heading" className="m-0 font-heading text-xl font-bold text-heading">
        {t('requests.title')}
      </h2>
      <p aria-live="polite" className="m-0 text-sm text-body">
        {deciding.outcome !== null && t(outcomeKeys[deciding.outcome], { name: lastName })}
      </p>
      {requests.isError && <Notice tone="error">{t('requests.loadFailed')}</Notice>}
      {deciding.failure !== null && (
        <Notice tone="error">{t(...spaceFailureText(deciding.failure))}</Notice>
      )}
      {requests.isSuccess && list.length === 0 && (
        <p className="m-0 text-sm text-body">{t('requests.none')}</p>
      )}
      {list.length > 0 && (
        <ul className="m-0 list-none p-0">
          {list.map((request) => (
            <RequestRow
              key={request.person?.handle ?? request.requestedAt}
              request={request}
              onDecide={decide}
              isRunning={deciding.isRunning}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
