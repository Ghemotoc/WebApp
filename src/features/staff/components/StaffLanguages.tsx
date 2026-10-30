/**
 * StaffLanguages: the languages a staff member reads, as tick boxes with a Save button (story
 * S1-E11-05; board AdminSettings: "Staff add the languages they read in Users").
 *
 * The list of languages comes from the database (story_language_choices()), so a story language
 * added later shows here too. Who shows it: StaffMemberCard. What it calls: useStaffLanguages and
 * useStoryFormOptions (the languages).
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { languageNameOf } from '@/features/settings/lib/marketNames';
import { useStoryFormOptions } from '@/features/writing/hooks/useStoryFormOptions';

import { useStaffLanguages } from '../hooks/useStaffLanguages';

/**
 * The tick boxes, once the person's languages are read.
 *
 * @returns the fieldset
 */
function LanguageChecks(props: { userId: string; handle: string; saved: string[] }) {
  const { t, i18n } = useTranslation('staff');
  const { languages } = useStoryFormOptions();
  const { save, isSaving, isSaved, hasFailed } = useStaffLanguages(props.userId);
  const [chosen, setChosen] = useState<string[]>(props.saved);
  const toggle = (code: string) =>
    setChosen((current) =>
      current.includes(code) ? current.filter((other) => other !== code) : [...current, code],
    );
  return (
    <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
      <legend className="text-sm font-semibold text-ink">{t('languages.heading')}</legend>
      <p className="m-0 text-[13px] text-meta">{t('languages.hint')}</p>
      <div className="flex flex-wrap gap-x-4">
        {languages.map(({ code }) => (
          <label key={code} className="inline-flex min-h-11 items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={chosen.includes(code)}
              onChange={() => toggle(code)}
            />
            <span lang={code}>{languageNameOf(code, i18n.language)}</span>
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          disabled={isSaving}
          onClick={() => save(chosen)}
          aria-label={t('languages.saveLabel', { handle: props.handle })}
        >
          {t('languages.save')}
        </Button>
        {isSaved && (
          <span className="text-sm text-body" role="status">
            {t('languages.saved')}
          </span>
        )}
      </div>
      {hasFailed && <Notice tone="error">{t('languages.failed')}</Notice>}
    </fieldset>
  );
}

/**
 * Renders the languages part of a staff card.
 *
 * @param props.userId - the staff member
 * @param props.handle - their username, for the button's name
 * @returns the tick boxes, or nothing until their languages are read
 */
export function StaffLanguages({ userId, handle }: { userId: string; handle: string }) {
  const { codes } = useStaffLanguages(userId);
  if (codes === null) return null;
  return <LanguageChecks userId={userId} handle={handle} saved={codes} />;
}
