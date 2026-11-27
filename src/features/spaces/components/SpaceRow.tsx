/**
 * SpaceRow: one space in a list on the Spaces page, as board F06 draws it (bundle BOOKS-7, user
 * story 7.6; it replaces the cards of bundle G8b).
 *
 * A flat row with a hairline above it: the 64 px tile (the logo, or the banner colour as a blob;
 * never initials or a face), the name as a link, a meta line ("214 members · members-only posting
 * · latest post 20 min ago") and the description. A class space says only "Private · only class
 * members see it" (user story 7.6). Under "More spaces" the row ends with Join, Ask to join or
 * Asked.
 * Who shows it: SpacesJoinedSection and SpacesMoreSection. What it calls: SpaceTile, MetaLine,
 * comments/lib/timeAgo and SpaceRowJoinButton.
 */
import { Link } from 'react-router';

import { MetaLine, type MetaFact } from '@/components/ui/MetaLine';
import { timeAgo } from '@/features/comments/lib/timeAgo';

import type { Space } from '../api/spaces';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { SpaceRowJoinButton } from './SpaceRowJoinButton';
import { SpaceTile } from './SpaceTile';

/** What a row needs. */
export interface SpaceRowProps {
  space: Space;
  /** Under "More spaces": the row ends with Join, Ask to join or Asked. */
  isJoinOffered: boolean;
}

/**
 * The facts under the name.
 *
 * @param space - the space
 * @param t - the spaces translator
 * @param language - the interface language, for "20 min ago"
 * @returns the facts, in reading order
 */
function factsFor(
  space: Space,
  t: ReturnType<typeof useSpacesTranslation>['t'],
  language: string,
): MetaFact[] {
  // A class space shows only that it is private (user story 7.6).
  if (space.kind === 'class') {
    return [{ text: t('list.private'), kind: 'state' }, { text: t('list.classOnly') }];
  }
  const posting = t(space.posting === 'members' ? 'card.postingMembers' : 'card.postingAnyone');
  const facts: MetaFact[] = [{ text: t('space.members', { count: space.memberCount }) }];
  facts.push({ text: posting });
  if (space.latestActivityAt !== '') {
    facts.push({ text: t('list.latestPost', { when: timeAgo(space.latestActivityAt, language) }) });
  }
  return facts;
}

/**
 * Renders the row.
 *
 * @returns the list item
 */
export function SpaceRow({ space, isJoinOffered }: SpaceRowProps) {
  const { t, i18n } = useSpacesTranslation();
  const isClass = space.kind === 'class';
  return (
    <li className="flex items-center gap-4 border-t border-border py-3">
      <SpaceTile space={space} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link
          to={`/spaces/${space.slug}`}
          className="type-label font-semibold break-words text-ink-heading no-underline hover:underline"
        >
          {space.name}
        </Link>
        <MetaLine facts={factsFor(space, t, i18n.language)} />
        {/* A class space keeps its description for its members' own page. */}
        {!isClass && space.description !== '' && (
          <p className="m-0 type-body break-words text-ink-muted">{space.description}</p>
        )}
      </div>
      {isJoinOffered && <SpaceRowJoinButton space={space} />}
    </li>
  );
}
