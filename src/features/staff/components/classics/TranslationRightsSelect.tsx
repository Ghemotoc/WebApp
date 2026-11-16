/**
 * TranslationRightsSelect: "Translation rights" on a classic's forms (bundle TRANSLATE-1d; board
 * TrStaff; Robert, 16 Nov 2026): why a translated text may be shown. A translation has its own
 * copyright, apart from the original's, so staff say which of three grounds applies: the
 * translation is in the public domain, a licence is signed, or it was made for the platform.
 *
 * Who shows it: ClassicSourceFields (a classic's own details) and ClassicEditionForm (an edition).
 * What it calls: onChange with the chosen value, or '' for "Choose one". The database refuses to
 * publish a translated classic without a choice (admin_publish_classic(): translation_rights_missing).
 */
import { useTranslation } from 'react-i18next';

import { Select } from '@/components/ui/Select';

import { translationRightsChoices, type TranslationRights } from '../../api/classics';

/** What the drop-down needs. */
export interface TranslationRightsSelectProps {
  /** Unique id; the hint's id is built from it. */
  id: string;
  value: TranslationRights | '';
  onChange: (value: TranslationRights | '') => void;
}

/**
 * Renders the drop-down with its hint.
 *
 * @returns the labelled drop-down and the hint under it
 */
export function TranslationRightsSelect({ id, value, onChange }: TranslationRightsSelectProps) {
  const { t } = useTranslation('staff');
  const hintId = `${id}-hint`;
  // "Choose one" comes first, so nothing is claimed until staff decide.
  const options = [
    { value: '', label: t('classics.editions.form.chooseOne') },
    ...translationRightsChoices.map((choice) => ({
      value: choice,
      label: t(`classics.editions.rightsValues.${choice}`),
    })),
  ];
  return (
    <div className="flex flex-col gap-1">
      <Select
        id={id}
        label={t('classics.editions.form.rights')}
        isLabelVisible
        placement="form"
        descriptionId={hintId}
        value={value}
        onChange={(chosen) => onChange(chosen as TranslationRights | '')}
        options={options}
      />
      <p id={hintId} className="m-0 text-[13px] text-meta">
        {t('classics.editions.form.rightsHint')}
      </p>
    </div>
  );
}
