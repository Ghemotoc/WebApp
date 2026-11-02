/**
 * SpaceHeaderCard: the space's header: its banner, badge, "Space · run by members", name,
 * description, pills, "214 members · Owner: inkwolf", the join buttons and Report (bundle
 * FORUMS-2, parts a and b; S1-E8-06 and S1-E8-07; design/boards/Space.dc.html's header).
 *
 * Board values: a 28 px card with a 168 px banner band, the 88 px badge overlapping it, the name
 * in Bricolage Grotesque at 36 to 64 px and the description at 18 px. The owner sees "Space
 * settings" where others see Report (nobody reports their own space; rule 6 for everyone else);
 * moderators also see the links to what their powers let them do (SpaceToolLinks).
 * Share comes with the share card (S1-E4-05) for spaces later, so it is left out here (noted in
 * docs/board-fixes.md).
 * Who shows it: SpacePage. What it calls: SpaceBadge, SpacePills, SpaceJoinActions,
 * SpaceToolLinks, ReportButton.
 */
import { Link } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { nameOf } from '@/features/forums/lib/forumPeople';
import { ReportButton } from '@/features/reporting/components/ReportButton';

import type { Space } from '../api/spaces';
import { bannerBackgrounds } from '../lib/spaceLook';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { SpaceBadge } from './SpaceBadge';
import { SpaceJoinActions } from './SpaceJoinActions';
import { SpacePills } from './SpacePills';
import { SpaceToolLinks } from './SpaceToolLinks';

/**
 * "214 members · Owner: inkwolf", the owner's name a link to their profile.
 *
 * @returns the line
 */
function SpaceNumbers({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  const owner = space.owner;
  return (
    <p className="m-0 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-body">
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
    </p>
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
 * Renders the header.
 *
 * @param props.space - the space
 * @returns the section named by the space's name
 */
export function SpaceHeaderCard({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  return (
    <section
      aria-labelledby="space-title"
      className="relative overflow-hidden rounded-[28px] border border-border bg-surface shadow-card"
    >
      <div
        aria-hidden="true"
        className="h-[120px] md:h-[168px]"
        style={{ background: bannerBackgrounds[space.banner] }}
      />
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5 px-5 pb-8 md:px-10">
        <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-3.5">
          <span className="-mt-11">
            <SpaceBadge name={space.name} banner={space.banner} size="large" />
          </span>
          <Eyebrow>{t('space.eyebrow')}</Eyebrow>
          <h1
            id="space-title"
            className="m-0 text-[clamp(36px,4.4vw,64px)] leading-[0.98] font-extrabold tracking-[-0.025em] break-words"
          >
            {space.name}
          </h1>
          {space.description !== '' && (
            <p className="m-0 max-w-[680px] text-lg leading-relaxed break-words text-body">
              {space.description}
            </p>
          )}
          <SpacePills space={space} />
          <SpaceNumbers space={space} />
        </div>
        <div className="flex flex-col items-start gap-3 md:items-end">
          <SpaceJoinActions space={space} />
          <SpaceToolLinks space={space} />
          <SpaceReport space={space} />
        </div>
      </div>
    </section>
  );
}
