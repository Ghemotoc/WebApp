/**
 * GivePointsForm: a pupil gives this week's points to a classmate's chapter (bundle CLASS-POINTS,
 * part 1; story S1-E8-13).
 *
 * What it shows: "None", 1, 2 and 3 as chips (never more than the weekly cap for one chapter, and
 * a choice the pupil can't afford this week is greyed out), "7 of 10 points left this week", one
 * optional line for the writer, and the button. Points can move until the week ends, so the same
 * form changes or takes back what was given. No counter of what classmates gave ever shows here
 * (criterion 8).
 * Who shows it: ChapterClassPoints, for a classmate. What it calls: useGiveClassPoints →
 * give_class_points(). The database checks the cap, the budget and that the chapter was opened.
 */
import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { ChoiceChips, type ChoiceOption } from '@/components/ui/ChoiceChips';
import { Notice } from '@/components/ui/Notice';
import { TextInput } from '@/components/ui/TextInput';

import type { ChapterGiving } from '../api/classPoints';
import { useGiveClassPoints } from '../hooks/useClassPoints';
import { dayText, lastDayBefore } from '../lib/classPointsDates';
import { useClassPointsTranslation } from '../registerClassPointsTranslations';

/** What the form needs. */
export interface GivePointsFormProps {
  chapterId: string;
  giving: ChapterGiving;
}

/**
 * The chips: "None", then 1 point up to the cap for one chapter.
 *
 * @param giving - what the pupil may give
 * @param noneLabel - the words for zero
 * @param pointsLabel - the words for a number of points
 * @returns the choices; one the pupil can't afford this week is disabled
 */
function giveOptions(
  giving: ChapterGiving,
  noneLabel: string,
  pointsLabel: (count: number) => string,
): ChoiceOption[] {
  // What the pupil could give this chapter: what is left this week plus what it already has.
  const affordable = giving.left + giving.given;
  const options: ChoiceOption[] = [{ value: '0', label: noneLabel }];
  for (let amount = 1; amount <= giving.cap; amount += 1) {
    options.push({
      value: String(amount),
      label: pointsLabel(amount),
      isDisabled: amount > affordable,
    });
  }
  return options;
}

/**
 * Renders the form.
 *
 * @returns the chips, the note field, the button and what happened
 */
export function GivePointsForm({ chapterId, giving }: GivePointsFormProps) {
  const { t, i18n } = useClassPointsTranslation();
  const giver = useGiveClassPoints(chapterId);
  const [points, setPoints] = useState(giving.given);
  const [note, setNote] = useState(giving.note ?? '');
  const [savedPoints, setSavedPoints] = useState<number | null>(null);

  const options = giveOptions(giving, t('chapter.give.none'), (count) =>
    t('chapter.give.points', { count }),
  );

  /** Saves the choice; zero takes the points back. */
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavedPoints(null);
    const saved = await giver.give({ points, note }).catch(() => null);
    if (saved !== null) setSavedPoints(points);
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={save}>
      <ChoiceChips
        label={t('chapter.give.label')}
        options={options}
        value={String(points)}
        onChange={(value) => setPoints(Number(value))}
      />
      <p className="m-0 text-sm text-body">
        {t('chapter.give.left', { count: giving.budget, left: giving.left })}{' '}
        {t('chapter.give.resets', {
          date: dayText(lastDayBefore(giving.resetsOn), i18n.language),
        })}
      </p>
      {points > 0 && (
        <TextInput
          id={`class-point-note-${chapterId}`}
          label={t('chapter.give.noteLabel')}
          hint={t('chapter.give.noteHint', { max: giving.noteMax })}
          value={note}
          maxLength={giving.noteMax}
          onChange={(event) => setNote(event.target.value)}
        />
      )}
      <Button type="submit" className="self-start" disabled={giver.isRunning}>
        {giving.given > 0 ? t('chapter.give.change') : t('chapter.give.save')}
      </Button>
      <div aria-live="polite">
        {giver.failure !== null && (
          <Notice tone="error">{t(`failures.${giver.failure.failure}`)}</Notice>
        )}
        {savedPoints !== null && giver.failure === null && (
          <Notice tone="success">
            {savedPoints === 0
              ? t('chapter.give.takenBack')
              : t('chapter.give.saved', { count: savedPoints })}
          </Notice>
        )}
      </div>
    </form>
  );
}
