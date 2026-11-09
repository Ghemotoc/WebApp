/**
 * SpaceBannerChoice: "Banner (optional)", the fourteen banner colours as swatches (bundle FORUMS-2,
 * part a, redrawn in G8b; S1-E8-06; boards SpaceSettings and SpaceNew).
 *
 * The board draws 64 × 40 px swatches with 12 px corners, eight deep colours then six pastels,
 * with "Deep colours or pastels." under the label. Each swatch is a real radio button (one choice
 * from a group, arrow keys move between them) hidden behind its tile, named by its colour ("Plum",
 * "Sky mist"); the chosen tile gets a ring and a tick, and the line under the swatches names the
 * chosen colour, so the choice never rests on colour alone (WCAG 1.4.1). An uploaded banner
 * picture is chosen on the settings page (SpaceBannerPictureCard).
 * Who uses it: SpaceForm. What it calls: lib/spaceLook.ts for the swatches.
 */
import { useId } from 'react';

import { CheckIcon } from '@/components/icons/CheckIcon';

import { spaceBanners, type SpaceBanner } from '../api/spaces';
import { bannerSwatch, bannerTextColour } from '../lib/spaceLook';
import { useSpacesTranslation } from '../registerSpacesTranslations';

/**
 * One swatch: the hidden radio button and the tile that shows it.
 *
 * @returns the label holding both
 */
function BannerSwatch({
  banner,
  groupName,
  isChosen,
  onChoose,
}: {
  banner: SpaceBanner;
  groupName: string;
  isChosen: boolean;
  onChoose: () => void;
}) {
  const { t } = useSpacesTranslation();
  return (
    <label className="relative inline-flex">
      <input
        type="radio"
        name={groupName}
        value={banner}
        aria-label={t(`form.banners.${banner}`)}
        className="peer absolute inset-0 size-full cursor-pointer appearance-none rounded-xl"
        checked={isChosen}
        onChange={onChoose}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none inline-flex h-10 w-16 items-center justify-center rounded-xl border border-border ring-offset-2 ring-offset-surface peer-checked:ring-2 peer-checked:ring-heading peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-focus-ring"
        style={{ background: bannerSwatch(banner), color: bannerTextColour(banner, false) }}
      >
        {isChosen && <CheckIcon />}
      </span>
    </label>
  );
}

/**
 * Renders the choice.
 *
 * @param props.value - the banner picked
 * @param props.onChange - called with the new banner
 * @returns the fieldset
 */
export function SpaceBannerChoice({
  value,
  onChange,
}: {
  value: SpaceBanner;
  onChange: (banner: SpaceBanner) => void;
}) {
  const { t } = useSpacesTranslation();
  const groupName = useId();
  const hintId = `${groupName}-hint`;
  return (
    <fieldset className="m-0 flex flex-col gap-2 border-0 p-0" aria-describedby={hintId}>
      <legend className="mb-1 p-0 text-sm font-semibold text-heading">{t('form.banner')}</legend>
      <p id={hintId} className="m-0 text-sm text-meta">
        {t('form.bannerHint')}
      </p>
      <div className="flex flex-wrap gap-2.5">
        {spaceBanners.map((banner) => (
          <BannerSwatch
            key={banner}
            banner={banner}
            groupName={groupName}
            isChosen={value === banner}
            onChoose={() => onChange(banner)}
          />
        ))}
      </div>
      <p aria-live="polite" className="m-0 text-sm text-body">
        {t('form.bannerChosen', { name: t(`form.banners.${value}`) })}
      </p>
    </fieldset>
  );
}
