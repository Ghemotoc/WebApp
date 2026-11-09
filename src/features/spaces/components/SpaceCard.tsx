/**
 * SpaceCard: one space on the /spaces page, as board Spaces draws it in the liquid glass redesign
 * (bundle G8b; story S1-E8-06).
 *
 * A glass card with 28 px corners: the logo when the space has one (nothing otherwise), the name
 * as a link, "214 members · members-only posting", the description and "Latest post 14 Nov,
 * 19:02". The whole card isn't one link, so the name stays the one clear target and the text can
 * be selected; the name's link stretches over the card for a pointer.
 * Who shows it: SpacesPage. What it calls: SpaceLogo and forumDates.postTime().
 */
import { Link } from 'react-router';

import { postTime } from '@/features/forums/lib/forumDates';

import type { Space } from '../api/spaces';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { SpaceLogo } from './SpaceLogo';

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
    <li className="relative flex flex-col gap-3 rounded-[28px] border border-border bg-surface p-5 shadow-card transition-shadow hover:shadow-lg md:p-6">
      <div className="flex items-center gap-3.5">
        <SpaceLogo space={space} size="small" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <Link
            to={`/spaces/${space.slug}`}
            className="font-heading text-xl leading-tight font-bold break-words text-heading no-underline after:absolute after:inset-0 after:rounded-[28px] hover:underline"
          >
            {space.name}
          </Link>
          <span className="text-sm text-meta">{t('card.meta', { members, posting })}</span>
        </div>
      </div>
      {space.description !== '' && (
        <p className="m-0 line-clamp-3 text-[15px] leading-relaxed break-words text-body">
          {space.description}
        </p>
      )}
      {space.latestActivityAt !== '' && (
        <span className="mt-auto text-sm text-meta">
          {t('card.latest', { when: postTime(space.latestActivityAt, i18n.language) })}
        </span>
      )}
    </li>
  );
}
