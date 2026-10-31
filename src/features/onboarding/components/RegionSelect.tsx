/**
 * RegionSelect: the optional county drop-down with its hint (story S1-E2-06; board Onboarding
 * 2.5, step 1).
 *
 * Who shows it: NameStep and LikesSettingsSection. What it calls: nothing; the parent saves.
 * The first choice is "I'd rather not say" (an empty value), so the county is never forced. Names
 * are shown in the page's language (Bucharest in English, București in Romanian).
 */
import { useTranslation } from 'react-i18next';

import { Select } from '@/components/ui/Select';

import type { Region } from '../api/onboarding';

/** What the drop-down needs. */
export interface RegionSelectProps {
  id: string;
  regions: Region[];
  /** The chosen county, or '' for none. */
  value: string;
  onChange: (regionCode: string) => void;
}

/**
 * Renders the drop-down and its hint.
 *
 * @returns the county field
 */
export function RegionSelect({ id, regions, value, onChange }: RegionSelectProps) {
  const { t, i18n } = useTranslation('account');
  const hintId = `${id}-hint`;
  const options = [
    { value: '', label: t('onboarding.name.regionNone') },
    ...regions.map((region) => ({
      value: region.code,
      label: i18n.language === 'en' ? region.nameEn : region.nameRo,
    })),
  ];
  return (
    <div className="flex flex-col gap-1.5">
      <Select
        id={id}
        label={t('onboarding.name.regionLabel')}
        isLabelVisible
        options={options}
        value={value}
        onChange={onChange}
        descriptionId={hintId}
      />
      <p id={hintId} className="m-0 text-[13px] text-meta">
        {t('onboarding.name.regionHint')}
      </p>
    </div>
  );
}
