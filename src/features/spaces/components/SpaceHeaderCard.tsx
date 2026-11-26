/**
 * SpaceHeaderCard: the space's header, as design/boards/Space.dc.html draws it in the liquid glass
 * redesign (bundle FORUMS-2, parts a and b, redrawn in G8b; stories S1-E8-06 and S1-E8-07).
 *
 * One card. Its top is the banner, a 7 to 1 strip at every size (SpaceBannerBand: the space's
 * colour, or its uploaded picture once the picture passed its check; CALM-9, board F08). Under it,
 * 24 px away (16 px on a phone), everything that says what the space is: the logo when there is
 * one, "Space · run by members", the name and the description, with the join button, the
 * moderators' tools and Report on the right. Under that, a meta row: who reads, the age group, who posts, "214 members" and "Owner: inkwolf".
 * The owner sees "Space settings" where others see Report (nobody reports their own space; rule 6
 * for everyone else). "Share" (GAPS-10) opens the link, "Copy link" and a QR code; a class space
 * has none.
 * Who shows it: SpacePage. What it calls: SpaceBannerBand, SpaceLogo, SpaceFacts,
 * SpaceJoinActions, SpaceShareButton, SpaceToolLinks, ReportButton.
 */
import { Link } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { nameOf } from '@/features/forums/lib/forumPeople';
import { ReportButton } from '@/features/reporting/components/ReportButton';

import type { Space } from '../api/spaces';
import { useSpaceBannerView } from '../hooks/useSpaceBanner';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { SpaceBannerBand } from './SpaceBannerBand';
import { SpaceJoinActions } from './SpaceJoinActions';
import { SpaceLogo } from './SpaceLogo';
import { SpaceFacts } from './SpaceFacts';
import { SpaceShareButton } from './SpaceShareButton';
import { SpaceToolLinks } from './SpaceToolLinks';

/**
 * "214 members · Owner: inkwolf", the owner's name a link to their profile.
 *
 * @returns the two items
 */
function SpaceNumbers({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  const owner = space.owner;
  return (
    <>
      <span>{t('space.members', { count: space.memberCount })}</span>
      <span>
        {t('space.owner')}{' '}
        {owner === null ? (
          nameOf(owner, t('row.ownerDeleted'))
        ) : (
          <Link to={`/u/${owner.handle}`} className="font-semibold text-link underline">
            {owner.displayName}
          </Link>
        )}
      </span>
    </>
  );
}

/**
 * Report, for everyone but the owner.
 *
 * @returns the button, or nothing for the owner
 */
function SpaceReport({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  if (space.viewer.membership === 'owner') return null;
  return (
    <ReportButton
      itemType="space"
      itemReference={space.id}
      itemLabel={t('space.reportLabel', { name: space.name })}
    />
  );
}

/**
 * The logo, the name and the description, under the banner.
 *
 * @returns the left part of the header
 */
function SpaceTitle({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  return (
    <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-4 md:flex-row md:items-center md:gap-6">
      <SpaceLogo space={space} size="large" />
      <div className="flex min-w-0 flex-col gap-3">
        <Eyebrow>{t('space.eyebrow')}</Eyebrow>
        <h1
          id="space-title"
          className="m-0 type-title break-words text-ink-heading lg:type-display"
        >
          {space.name}
        </h1>
        {space.description !== '' && (
          <p className="m-0 max-w-[680px] type-long leading-relaxed break-words text-ink-muted">
            {space.description}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Renders the header.
 *
 * @param props.space - the space
 * @returns the section named by the space's name
 */
export function SpaceHeaderCard({ space }: { space: Space }) {
  const picture = useSpaceBannerView(space).data ?? null;
  // A picture still being checked, waiting for a person or removed shows the colour instead.
  const pictureUrl = picture !== null && picture.state === 'visible' ? picture.url : null;
  return (
    <section
      aria-labelledby="space-title"
      className="relative overflow-hidden rounded-card border border-border bg-surface shadow-card"
    >
      {/* Board F08 (23 Nov 2026): the banner is a 7 to 1 strip at every size, the same shape the
          new-space guide shows, with the name under it. The board draws 20 px (14 on a phone);
          the spacing scale gives 24 (16). */}
      <div className="flex flex-col gap-4 px-4 pt-4 md:gap-6 md:px-6 md:pt-6">
        <div className="relative aspect-[7/1] w-full overflow-hidden rounded-card">
          <SpaceBannerBand banner={space.banner} pictureUrl={pictureUrl} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-6">
          <SpaceTitle space={space} />
          <div className="flex flex-col items-start gap-3 md:items-end">
            <SpaceJoinActions space={space} />
            <SpaceToolLinks space={space} />
            <div className="flex flex-wrap items-center gap-3 md:justify-end">
              <SpaceShareButton space={space} />
              <SpaceReport space={space} />
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 type-body text-ink-muted md:px-6">
        <SpaceFacts space={space} />
        <SpaceNumbers space={space} />
      </div>
    </section>
  );
}
