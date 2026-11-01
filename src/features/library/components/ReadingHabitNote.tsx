/**
 * ReadingHabitNote: "Your reading days", the private reading streak in the Library (bundle
 * IDEAS-1, part b; idea IDEA-20261031-13, Robert's comments of 31 Oct 2026).
 *
 * - Off (the start): a short line on what it does and "Turn it on". Nothing is counted until then.
 * - On: "You read on 5 days this week", today's minutes against the target ("12 of 15 minutes
 *   today", with a progress bar), the target and reminder (ReadingHabitSettings) and "Turn off and
 *   delete my minutes", which asks once before deleting.
 * Only the reader sees it: it is never a public badge (criterion 1). No doodles: a quiet note.
 * Who uses it: LibraryPage. What it calls: useReadingHabit (my_reading_habit() and the changes).
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import type { ReadingHabit } from '@/features/reading-habit/api/readingHabit';
import { useReadingHabit } from '@/features/reading-habit/hooks/useReadingHabit';

import { useLibraryTranslation } from '../registerLibraryTranslations';

import { ReadingHabitSettings } from './ReadingHabitSettings';

/** The days this week and today's minutes. */
function HabitSummary({ habit }: { habit: ReadingHabit }) {
  const { t } = useLibraryTranslation();
  const days =
    habit.daysThisWeek === 0
      ? t('habit.noDaysYet')
      : t('habit.daysThisWeek', { count: habit.daysThisWeek });
  if (habit.target === null) {
    return (
      <div className="flex flex-col gap-1">
        <p className="m-0 text-lg font-semibold text-heading">{days}</p>
        <p className="m-0 text-base text-body">
          {t('habit.minutesToday', { count: habit.minutesToday })}
        </p>
      </div>
    );
  }
  const isMet = habit.minutesToday >= habit.target;
  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 text-lg font-semibold text-heading">{days}</p>
      <p className="m-0 text-base text-body">
        {t('habit.minutesOfTarget', { minutes: habit.minutesToday, target: habit.target })}
        {isMet && ` ${t('habit.targetMet')}`}
      </p>
      <progress
        className="tmc-habit-progress h-2 w-full max-w-[360px]"
        aria-label={t('habit.progressLabel')}
        max={habit.target}
        value={Math.min(habit.minutesToday, habit.target)}
      />
    </div>
  );
}

/** "Turn off and delete my minutes", asked once before anything is deleted. */
function TurnOff({ stop }: { stop: ReturnType<typeof useReadingHabit>['stop'] }) {
  const { t } = useLibraryTranslation();
  const [isAsking, setIsAsking] = useState(false);
  if (!isAsking) {
    return (
      <div>
        <Button variant="destructive" onClick={() => setIsAsking(true)}>
          {t('habit.turnOff')}
        </Button>
      </div>
    );
  }
  return (
    <div role="group" aria-label={t('habit.turnOff')} className="flex flex-col gap-3">
      <p className="m-0 text-sm text-body">{t('habit.turnOffConfirm')}</p>
      <div className="flex flex-wrap gap-3">
        <Button variant="destructive" disabled={stop.isPending} onClick={() => stop.mutate()}>
          {t('habit.turnOffYes')}
        </Button>
        <Button variant="secondary" onClick={() => setIsAsking(false)}>
          {t('habit.keepIt')}
        </Button>
      </div>
    </div>
  );
}

/** The note's body while the streak is on. */
function HabitOn(props: {
  habit: ReadingHabit;
  save: ReturnType<typeof useReadingHabit>['save'];
  stop: ReturnType<typeof useReadingHabit>['stop'];
}) {
  const { t } = useLibraryTranslation();
  // Keyed on what is saved, so the form starts again from the database after each save.
  const savedKey = `${props.habit.target}-${props.habit.remindersOn}-${props.habit.reminderTime}`;
  return (
    <>
      <HabitSummary habit={props.habit} />
      <p className="m-0 text-[13px] text-meta">{t('habit.privateNote')}</p>
      <hr className="m-0 border-border" />
      <ReadingHabitSettings key={savedKey} habit={props.habit} save={props.save} />
      <hr className="m-0 border-border" />
      {props.stop.isError && <Notice tone="error">{t('habit.changeFailed')}</Notice>}
      <TurnOff stop={props.stop} />
    </>
  );
}

/** The note's body while the streak is off. */
function HabitOff({ start }: { start: ReturnType<typeof useReadingHabit>['start'] }) {
  const { t } = useLibraryTranslation();
  return (
    <>
      <p className="m-0 max-w-[640px] text-base text-body">{t('habit.offBody')}</p>
      {start.isError && <Notice tone="error">{t('habit.changeFailed')}</Notice>}
      <div>
        <Button variant="secondary" disabled={start.isPending} onClick={() => start.mutate()}>
          {t('habit.turnOn')}
        </Button>
      </div>
    </>
  );
}

/**
 * Renders the note.
 *
 * @returns the card, or nothing while loading
 */
export function ReadingHabitNote() {
  const { t } = useLibraryTranslation();
  const readingHabit = useReadingHabit();
  const { habit, loadFailed } = readingHabit;
  if (loadFailed) return <Notice tone="error">{t('habit.loadFailed')}</Notice>;
  if (habit === undefined) return null;
  return (
    <section id="reading-days" aria-labelledby="reading-days-heading">
      <Card className="flex flex-col gap-4">
        <Eyebrow>{t('habit.eyebrow')}</Eyebrow>
        <h2
          id="reading-days-heading"
          className="m-0 font-heading text-[26px] font-bold text-heading"
        >
          {t('habit.heading')}
        </h2>
        {habit === null ? (
          <HabitOff start={readingHabit.start} />
        ) : (
          <HabitOn habit={habit} save={readingHabit.save} stop={readingHabit.stop} />
        )}
      </Card>
    </section>
  );
}
