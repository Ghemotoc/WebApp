/**
 * SpaceBannerChoice: the four drawn banner colours as radio buttons, each with a swatch (bundle
 * FORUMS-2, part a; S1-E8-06). The board's "Upload a picture" comes in part b, with the picture
 * check (rule 19); noted in docs/board-fixes.md.
 * Who uses it: SpaceForm. What it calls: lib/spaceLook.ts for the swatches.
 */
import { useId } from 'react';

import { spaceBanners, type SpaceBanner } from '../api/spaces';
import { bannerBackgrounds } from '../lib/spaceLook';
import { useSpacesTranslation } from '../registerSpacesTranslations';

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
  return (
    <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
      <legend className="mb-2 p-0 font-eyebrow text-sm leading-[1.3] font-normal text-eyebrow">
        {t('form.banner')}
      </legend>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {spaceBanners.map((banner) => {
          const inputId = `${groupName}-${banner}`;
          return (
            <div key={banner} className="flex min-h-11 items-center gap-2.5">
              <input
                id={inputId}
                type="radio"
                name={groupName}
                className="h-5 w-5"
                checked={value === banner}
                onChange={() => onChange(banner)}
              />
              <span
                aria-hidden="true"
                className="h-6 w-10 rounded-md border border-border"
                style={{ background: bannerBackgrounds[banner] }}
              />
              <label htmlFor={inputId} className="text-[15px] text-heading">
                {t(`form.banners.${banner}`)}
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
