/**
 * MinorImageFields: the extra part of the red form when a picture reviewer chooses "Sexual image
 * of a minor" (bundle ADMIN-2, part e2b; Robert's brief of 2 Nov 2026, section 4).
 *
 * A required box, "Describe the image in a few words for the police.", because the image itself
 * is deleted at once and never kept, and a plain warning of what the decision does: the evidence
 * kept 5 years, the account closed for good, the case moved to safeguarding.
 * Who shows it: RejectPictureForm. What it calls: the onChange it is given.
 */
import { useTranslation } from 'react-i18next';

import { Notice } from '@/components/ui/Notice';
import { Textarea } from '@/components/ui/Textarea';

/** What the fields need. */
interface MinorImageFieldsProps {
  id: string;
  value: string;
  /** True once the moderator tried to send without a description. */
  isMissing: boolean;
  onChange: (value: string) => void;
}

/**
 * Renders the warning and the description box.
 *
 * @returns the fields
 */
export function MinorImageFields({ id, value, isMissing, onChange }: MinorImageFieldsProps) {
  const { t } = useTranslation('moderation');
  return (
    <>
      <Notice tone="warning">{t('pictures.minorWarning')}</Notice>
      <Textarea
        id={id}
        label={t('pictures.policeDescription')}
        hint={t('pictures.policeDescriptionHint')}
        value={value}
        required
        maxLength={500}
        onChange={(event) => onChange(event.target.value)}
      />
      {isMissing && (
        <p role="alert" className="m-0 text-sm text-(--error-text)">
          {t('pictures.describeMissing')}
        </p>
      )}
    </>
  );
}
