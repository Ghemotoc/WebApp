/**
 * LegalWordingBox: the "legal wording" tick on a help page or question, with the reminder that
 * such text must match the legal documents (story S1-E11-12 criterion 6; architecture 1.8.6:
 * wording about age, consent, privacy, reporting, messaging or money is admin-only and the legal
 * documents win if the two disagree).
 * Who uses it: HelpPageForm and QuestionForm.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { Notice } from '@/components/ui/Notice';

/** What the box needs. */
interface LegalWordingBoxProps {
  isLegal: boolean;
  onChange: (isLegal: boolean) => void;
}

/**
 * Renders the tick box and, when ticked, the reminder.
 *
 * @returns the box
 */
export function LegalWordingBox({ isLegal, onChange }: LegalWordingBoxProps) {
  const { t } = useTranslation('websiteAdmin');
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="inline-flex min-h-6 items-center gap-2 text-sm text-ink">
        <input
          id={id}
          type="checkbox"
          className="h-5 w-5"
          checked={isLegal}
          onChange={(event) => onChange(event.target.checked)}
        />
        {t('legal.label')}
      </label>
      {isLegal && <Notice tone="warning">{t('legal.reminder')}</Notice>}
    </div>
  );
}
