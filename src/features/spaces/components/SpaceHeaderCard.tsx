/**
 * SpaceHeaderCard: the space's header, as design/boards/Space.dc.html draws it in the liquid glass
 * redesign (bundle FORUMS-2, parts a and b, redrawn in G8b; stories S1-E8-06 and S1-E8-07).
 *
 * One glass card with 40 px corners. Its top is the banner (SpaceBannerBand: the space's colour, or
 * its uploaded picture under a dark wash once the picture passed its check) and everything that
 * says what the space is sits on it: the logo when there is one, "Space · run by members", the name
 * and the description, with the join button, the moderators' tools and Report on the right. The
 * text takes the colour that reads on the banner (white on deep colours and pictures, dark plum on
 * pastels) through the shared `genre-band` utility, which points every text token at it. Under the
 * banner, a meta row: who reads, the age group, who posts, "214 members" and "Owner: inkwolf".
 * The owner sees "Space settings" where others see Report (nobody reports their own space; rule 6
 * for everyone else). Share comes with the share card (S1-E4-05) for spaces later, so it is left
 * out here (noted in docs/board-fixes.md).
 * Who shows it: SpacePage. What it calls: SpaceBannerBand, SpaceLogo, SpacePills,
 * SpaceJoinActions, SpaceToolLinks, ReportButton.
 */
import type { CSSProperties } from 'react';
import { Link } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { nameOf } from '@/features/forums/lib/forumPeople';
import { ReportButton } from '@/features/reporting/components/ReportButton';

import type { Space } from '../api/spaces';
import { useSpaceBannerView } from '../hooks/useSpaceBanner';
import { bannerTextColour, isDeepBanner } from '../lib/spaceLook';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { SpaceBannerBand } from './SpaceBannerBand';
import { SpaceJoinActions } from './SpaceJoinActions';
import { SpaceLogo } from './SpaceLogo';
import { SpacePills } from './SpacePills';
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
 * The logo, the name and the description, on the banner.
 *
 * @returns the left part of the banner
 */
function SpaceTitle({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  return (
    <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-4 md:flex-row md:items-center md:gap-7">
      <SpaceLogo space={space} size="large" />
      <div className="flex min-w-0 flex-col gap-2.5">
        <Eyebrow>{t('space.eyebrow')}</Eyebrow>
        <h1
          id="space-title"
          className="m-0 font-heading text-[30px] leading-[1.02] font-bold tracking-[-0.025em] break-words text-heading md:text-[clamp(36px,4.4vw,56px)]"
        >
          {space.name}
        </h1>
        {space.description !== '' && (
          <p className="m-0 max-w-[680px] text-[17px] leading-relaxed break-words text-body">
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
  // The text colour that reads on this banner, handed to the genre-band utility.
  const hasPicture = pictureUrl !== null;
  const bandText = { '--band-text': bannerTextColour(space.banner, hasPicture) };
  // Deep colours and pictures carry white text, and their buttons change to match (index.css).
  const tone = hasPicture || isDeepBanner(space.banner) ? 'deep' : 'pastel';
  return (
    <section
      aria-labelledby="space-title"
      className="relative overflow-hidden rounded-[40px] border border-border bg-surface shadow-card"
    >
      <div className="relative">
        <SpaceBannerBand banner={space.banner} pictureUrl={pictureUrl} />
        <div
          data-banner-tone={tone}
          className="genre-band relative flex flex-wrap items-center justify-between gap-x-8 gap-y-6 px-5 pt-7 pb-6 md:px-11 md:pt-11 md:pb-10"
          style={bandText as CSSProperties}
        >
          <SpaceTitle space={space} />
          <div className="flex flex-col items-start gap-3 md:items-end">
            <SpaceJoinActions space={space} />
            <SpaceToolLinks space={space} />
            <SpaceReport space={space} />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 px-5 py-4 text-sm text-body md:px-11">
        <SpacePills space={space} />
        <SpaceNumbers space={space} />
      </div>
    </section>
  );
}
