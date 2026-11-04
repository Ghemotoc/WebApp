/**
 * StaffRatingReasons: why a story is 16+ or 18+, as staff may change it (bundle SPONSORS-f;
 * stories S1-E3-06, S1-E11-08 and S1-E12-04).
 *
 * The same tick boxes and words the writer sees. Shown only while the rating is 16+ or 18+; the
 * database empties the reasons below that. A moderator who ticks sexual content, nudity or graphic
 * violence turns network ads off on the story's pages at once (network_ads_barred()); the change
 * is versioned and logged like any other setting.
 * Who shows it: StaffStorySettingsFields. What it calls: LabelCheckbox.
 */
import { useTranslation } from 'react-i18next';

import { LabelCheckbox } from '@/features/writing/components/LabelCheckbox';
import { ratingsWithReasons, storyRatingReasons } from '@/schemas/story';

import type { StaffStorySettings } from '../../api/staffStories';

/** What the tick boxes need. */
export interface StaffRatingReasonsProps {
  settings: StaffStorySettings;
  onChange: (settings: StaffStorySettings) => void;
}

/**
 * Renders the tick boxes, or nothing below 16+.
 *
 * @returns the fieldset or null
 */
export function StaffRatingReasons({ settings, onChange }: StaffRatingReasonsProps) {
  const { t } = useTranslation('writing');
  if (!ratingsWithReasons.includes(settings.rating)) return null;
  return (
    <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
      <legend className="mb-1 p-0 text-sm font-semibold text-heading">
        {t('labels.reasons', { rating: t(`rating.${settings.rating}`) })}
      </legend>
      {storyRatingReasons.map((reason) => (
        <LabelCheckbox
          key={reason}
          id={`story-settings-reason-${reason}`}
          label={t(`labels.reasonNames.${reason}`)}
          isChecked={settings.ratingReasons.includes(reason)}
          onChange={(isChecked) =>
            onChange({
              ...settings,
              // Keep the list's own order so the change compares cleanly.
              ratingReasons: storyRatingReasons.filter((each) =>
                each === reason ? isChecked : settings.ratingReasons.includes(each),
              ),
            })
          }
        />
      ))}
    </fieldset>
  );
}
