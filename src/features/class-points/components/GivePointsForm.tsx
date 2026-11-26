/**
 * GivePointsForm: a pupil gives this week's points to a classmate's chapter (bundle CLASS-POINTS,
 * part 1; story S1-E8-13; bundle BOOKS-8, board G05-ClassGive, user story 8.5).
 *
 * What it shows (board G05): "Points" with 1, 2 and 3 as chips (never more than the weekly cap
 * for one chapter, and a choice the pupil can't afford this week is greyed out), "What worked
 * (optional)" with a count of the characters used, then "7 of 10 left · points can move until
 * Sunday" and "Give 2 points". Points can move until the week ends, so once the pupil gave some
 * a "None" chip takes them back. Nothing is picked at first; pressing the button then says to pick
 * (DoD: a member form never greys out its button). No counter of what classmates gave ever shows
 * here (criterion 8).
 * Who shows it: ChapterClassPoints, for a classmate. What it calls: useGiveClassPoints →
 * give_class_points(). The database checks the cap, the budget and that the chapter was opened.
 */
import type { TFunction } from 'i18next';
import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { ChoiceChips, type ChoiceOption } from '@/components/ui/ChoiceChips';
import { MetaLine } from '@/components/ui/MetaLine';
import { Notice } from '@/components/ui/Notice';
import { TextInput } from '@/components/ui/TextInput';
import { useMissingField } from '@/lib/forms/useMissingField';

import type { ChapterGiving } from '../api/classPoints';
import { useGiveClassPoints } from '../hooks/useClassPoints';
import { dayText, lastDayBefore } from '../lib/classPointsDates';
import { useClassPointsTranslation } from '../registerClassPointsTranslations';

/** What the form needs. */
export interface GivePointsFormProps {
  chapterId: string;
  giving: ChapterGiving;
}

/** The chips' value while nothing is picked. */
const nothingPicked = '';

/**
 * The chips: "None" once something was given, then 1 point up to the cap for one chapter.
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
  const options: ChoiceOption[] = [];
  // Zero only takes points back, so it shows only when there is something to take back.
  if (giving.given > 0) options.push({ value: '0', label: noneLabel });
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
 * The button's words for the points picked.
 *
 * @param points - the points picked, or null when nothing is
 * @param translate - the class points t()
 * @returns "Give 2 points", "Take the points back" or "Give points"
 */
function buttonText(points: number | null, translate: TFunction<'classPoints'>): string {
  if (points === null) return translate('chapter.give.giveAny');
  if (points === 0) return translate('chapter.give.takeBack');
  return translate('chapter.give.give', { count: points });
}

/**
 * The line with what is left and until when, then the button.
 *
 * @param props.giving - what the pupil may give
 * @param props.points - the points picked, or null
 * @param props.isRunning - whether a save is on its way
 * @returns the row
 */
function GiveFooter({
  giving,
  points,
  isRunning,
}: {
  giving: ChapterGiving;
  points: number | null;
  isRunning: boolean;
}) {
  const { t, i18n } = useClassPointsTranslation();
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
      <MetaLine
        facts={[
          {
            text: t('chapter.give.left', { count: giving.budget, left: giving.left }),
            kind: 'state',
          },
          {
            text: t('chapter.give.until', {
              date: dayText(lastDayBefore(giving.resetsOn), i18n.language),
            }),
          },
        ]}
      />
      <Button type="submit" disabled={isRunning}>
        {buttonText(points, t)}
      </Button>
    </div>
  );
}

/**
 * What happened after the button: the failure, or "Saved" / "Points taken back".
 *
 * @param props.failure - the failure's code, or null
 * @param props.savedPoints - the points just saved, or null before any save
 * @returns the live region
 */
function SaveResult({
  failure,
  savedPoints,
}: {
  failure: string | null;
  savedPoints: number | null;
}) {
  const { t } = useClassPointsTranslation();
  return (
    <div aria-live="polite">
      {failure !== null && <Notice tone="error">{t(`failures.${failure}`)}</Notice>}
      {savedPoints !== null && failure === null && (
        <Notice tone="success">
          {savedPoints === 0
            ? t('chapter.give.takenBack')
            : t('chapter.give.saved', { count: savedPoints })}
        </Notice>
      )}
    </div>
  );
}

/**
 * Renders the form.
 *
 * @returns the chips, the note field, the line with what is left, the button and what happened
 */
export function GivePointsForm({ chapterId, giving }: GivePointsFormProps) {
  const { t } = useClassPointsTranslation();
  const giver = useGiveClassPoints(chapterId);
  const [points, setPoints] = useState<number | null>(giving.given > 0 ? giving.given : null);
  const [note, setNote] = useState(giving.note ?? '');
  const [savedPoints, setSavedPoints] = useState<number | null>(null);
  const choiceId = `class-points-choice-${chapterId}`;
  const missing = useMissingField(points === null, choiceId);

  const options = giveOptions(giving, t('chapter.give.none'), (count) =>
    t('chapter.give.points', { count }),
  );

  /**
   * Saves the choice; zero takes the points back. The "Saved" note shows at once (design books
   * item 13: within 100 ms) and is taken away again if the server says no, when the failure
   * note shows instead.
   */
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Step 1: nothing picked yet: say so beside the chips and stop.
    if (!missing.isReadyToSend() || points === null) return;
    // Step 2: show the result straight away.
    setSavedPoints(points);
    // Step 3: send it; a refusal takes the note back and the failure note explains why.
    const saved = await giver.give({ points, note }).catch(() => null);
    if (saved === null) setSavedPoints(null);
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={save} noValidate>
      <div id={choiceId} tabIndex={-1} className="outline-none">
        <ChoiceChips
          label={t('chapter.give.label')}
          isLabelVisible
          options={options}
          value={points === null ? nothingPicked : String(points)}
          onChange={(value) => setPoints(Number(value))}
          descriptionId={`${choiceId}-problem`}
          description={
            missing.isShown && points === null ? (
              <span className="text-destructive">{t('chapter.give.pickFirst')}</span>
            ) : undefined
          }
        />
      </div>
      {points !== 0 && (
        <div className="w-full max-w-[480px]">
          <TextInput
            id={`class-point-note-${chapterId}`}
            label={t('chapter.give.noteLabel')}
            hint={t('chapter.give.noteHint', { max: giving.noteMax, used: note.length })}
            value={note}
            maxLength={giving.noteMax}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
      )}
      <GiveFooter giving={giving} points={points} isRunning={giver.isRunning} />
      <SaveResult failure={giver.failure?.failure ?? null} savedPoints={savedPoints} />
    </form>
  );
}
