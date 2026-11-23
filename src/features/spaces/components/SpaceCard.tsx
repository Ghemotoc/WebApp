/**
 * SpaceCard: one space on the /spaces page, as board Spaces draws it in the liquid glass redesign
 * (bundle G8b; story S1-E8-06).
 *
 * A card: the 64 px tile (the logo, or the banner colour as a blob; CALM-9, board F06), the name
 * as a link, "214 members · members-only posting", the description and "Latest post 14 Nov,
 * 19:02". The whole card isn't one link, so the name stays the one clear target and the text can
 * be selected; the name's link stretches over the card for a pointer.
 * Who shows it: SpacesPage. What it calls: SpaceTile and forumDates.postTime().
 */
import { Link } from 'react-router';

import { postTime } from '@/features/forums/lib/forumDates';

import type { Space } from '../api/spaces';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { SpaceTile } from './SpaceTile';

/**
 * Renders the card.
 *
 * @param props.space - the space
 * @returns the list item
 */
export function SpaceCard({ space }: { space: Space }) {
  const { t, i18n } = useSpacesTranslation();
  const posting = t(space.posting === 'members' ? 'card.postingMembers' : 'card.postingAnyone');
  const members = t('space.members', { count: space.memberCount });
  return (
    <li className="relative flex flex-col gap-3 rounded-card border border-border bg-surface p-4 shadow-card transition-shadow hover:shadow-lg md:p-6">
      <div className="flex items-center gap-4">
        <SpaceTile space={space} />
        <div className="flex min-w-0 flex-col gap-1">
          <Link
            to={`/spaces/${space.slug}`}
            className="font-heading type-subheading leading-tight font-bold break-words text-ink-heading no-underline after:absolute after:inset-0 after:rounded-card hover:underline"
          >
            {space.name}
          </Link>
          <span className="type-body text-ink-muted">{t('card.meta', { members, posting })}</span>
        </div>
      </div>
      {space.description !== '' && (
        <p className="m-0 line-clamp-3 type-body leading-relaxed break-words text-ink-muted">
          {space.description}
        </p>
      )}
      {space.latestActivityAt !== '' && (
        <span className="mt-auto type-body text-ink-muted">
          {t('card.latest', { when: postTime(space.latestActivityAt, i18n.language) })}
        </span>
      )}
    </li>
  );
}
