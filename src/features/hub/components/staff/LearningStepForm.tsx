/**
 * LearningStepForm: changes one day of the learning path: its title, short lesson and small task
 * in English and Romanian (bundle GAPS-12g). English comes first: it is the main language
 * (Robert, 10 Nov 2026).
 *
 * Who shows it: LearningPathSection. What it calls: the onSave and onCancel it is given.
 */
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { TextInput } from '@/components/ui/TextInput';
import { errorShownByHook } from '@/lib/errorShownByHook';

import { learningStepLimits, type LearningStep, type LearningStepTexts } from '../../api/hubPath';
import { useHubTranslation } from '../../registerHubTranslations';

/** What the form needs. */
export interface LearningStepFormProps {
  step: LearningStep;
  isBusy: boolean;
  onSave: (texts: LearningStepTexts) => Promise<unknown>;
  onCancel: () => void;
}

/** The six fields in the order the form shows them: which text, its limit, language and size. */
const fields = [
  { field: 'titleEn', limit: learningStepLimits.title, lang: 'en', isLong: false },
  { field: 'titleRo', limit: learningStepLimits.title, lang: 'ro', isLong: false },
  { field: 'lessonEn', limit: learningStepLimits.lesson, lang: 'en', isLong: true },
  { field: 'lessonRo', limit: learningStepLimits.lesson, lang: 'ro', isLong: true },
  { field: 'taskEn', limit: learningStepLimits.task, lang: 'en', isLong: false },
  { field: 'taskRo', limit: learningStepLimits.task, lang: 'ro', isLong: false },
] as const;

/**
 * Renders the form.
 *
 * @returns the form
 */
export function LearningStepForm({ step, isBusy, onSave, onCancel }: LearningStepFormProps) {
  const { t } = useHubTranslation();
  const [texts, setTexts] = useState<LearningStepTexts>(step);
  // Every text is needed; the database checks again.
  const isComplete = fields.every((entry) => texts[entry.field].trim() !== '');

  /** Saves the day; the section closes the form once it is saved and shows why when it isn't. */
  function submit(event: FormEvent) {
    event.preventDefault();
    if (isComplete) void onSave(texts).catch(errorShownByHook);
  }

  return (
    <form noValidate className="flex flex-col gap-4" onSubmit={submit}>
      {fields.map((entry) => {
        const shared = {
          id: `path-${step.day}-${entry.field}`,
          label: t(`hubStaff.path.fields.${entry.field}`),
          lang: entry.lang,
          maxLength: entry.limit,
          value: texts[entry.field],
        };
        return entry.isLong ? (
          <Textarea
            key={entry.field}
            {...shared}
            rows={7}
            hint={t('hubStaff.path.lessonHint')}
            onChange={(event) => setTexts({ ...texts, [entry.field]: event.target.value })}
          />
        ) : (
          <TextInput
            key={entry.field}
            {...shared}
            onChange={(event) => setTexts({ ...texts, [entry.field]: event.target.value })}
          />
        );
      })}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isBusy || !isComplete}>
          {t('hubStaff.save')}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          {t('hubStaff.cancel')}
        </Button>
      </div>
    </form>
  );
}
