/**
 * SpaceCoverCard: one space on Together as a cover card (CALM-9, board F01, 23 Nov 2026). The
 * cover is the space's banner (its picture once checked, or its colour) under a dark-to-clear
 * shade from the bottom; on it sit the space's name, its members and who can post, with a white
 * kind pill at the top left. The short description sits underneath in the plain box.
 *
 * The board's pill names a topic (Writing group, Poetry…); spaces have no topic yet, so the pill
 * names the kind the product has: an open space or a class (noted in the pull request).
 * Who shows it: SpacesCard on the forum index. What it calls: SpaceBannerBand (the colour and the
 * checked picture, CLAUDE.md rule 19) and useSpaceBannerView for the picture's address.
 */
import { Link } from 'react-router';

import type { Space } from '../api/spaces';
import { useSpaceBannerView } from '../hooks/useSpaceBanner';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { SpaceBannerBand } from './SpaceBannerBand';

/**
 * The facts under a space's name on its cover: members, then who can post (a class says it is
 * private instead, as only its members see it).
 *
 * @param space - the space
 * @param t - the spaces translation
 * @returns the facts in reading order
 */
function coverFacts(space: Space, t: ReturnType<typeof useSpacesTranslation>['t']): string[] {
  // Step 1: a class space is private, so the board shows that instead of the posting rule.
  if (space.kind === 'class') return [t('cover.private'), t('cover.classOnly')];
  // Step 2: an open space shows its members and who can post.
  const posting = space.posting === 'members' ? t('pills.membersOnly') : t('pills.anyonePosts');
  return [t('cover.members', { count: space.memberCount }), posting];
}

/**
 * Renders the card.
 *
 * @param props.space - the space to show
 * @returns a list item holding one link to the space
 */
export function SpaceCoverCard({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  // The checked picture's address, or null while there is none (the colour shows instead).
  const picture = useSpaceBannerView(space).data ?? null;
  const pictureUrl = picture !== null && picture.state === 'visible' ? picture.url : null;
  const kind = space.kind === 'class' ? t('cover.kindClass') : t('cover.kindOpen');
  return (
    <li className="m-0 flex">
      <Link
        to={`/spaces/${space.slug}`}
        data-testid="space-cover-card"
        className="flex w-full flex-col overflow-hidden rounded-card border border-border bg-surface no-underline"
      >
        <span className="relative flex min-h-28 flex-col justify-end px-4 py-3">
          <SpaceBannerBand banner={space.banner} pictureUrl={pictureUrl} />
          <span aria-hidden="true" className="absolute inset-0 space-cover-shade" />
          <span className="absolute top-3 left-3 rounded-full space-kind-pill px-3 type-kicker leading-5">
            {kind}
          </span>
          <span className="relative flex flex-col gap-1 space-cover-text">
            <span className="font-heading type-long font-bold break-words">{space.name}</span>
            <span className="type-meta space-cover-meta">{coverFacts(space, t).join(' · ')}</span>
          </span>
        </span>
        {space.description !== '' && (
          <span className="px-4 pt-3 pb-4 type-body break-words text-ink-muted">
            {space.description}
          </span>
        )}
      </Link>
    </li>
  );
}
