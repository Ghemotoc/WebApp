/**
 * HubPath: the learning path on the Writers' hub (bundle GAPS-12g; since user story 1.3 drawn as
 * on board A03-WritersHub: "The 7-day path is seven columns, Day 1 to Day 7").
 *
 * The heading and "A short lesson and a small task each day.", then seven columns: a finished day
 * shows a tick, the next open day is outlined in plum, later days are quiet; phones swipe the
 * columns sideways. Each day opens its lesson. Under them one wide quiet button: "Start day 1"
 * before any tick, "Continue day N" for the first day still open, or "Read the path again" once
 * every day is done. The lessons open at /hub/path.
 * Who shows it: WritersHubPage. What it calls: useLearningPath and learningPath.ts.
 */
import { Link } from 'react-router';

import { CheckIcon } from '@/components/icons/CheckIcon';
import { buttonClassName } from '@/components/ui/buttonStyles';
import { Notice } from '@/components/ui/Notice';
import { cn } from '@/lib/utils';

import type { LearningStep } from '../api/hubPath';
import { useLearningPath } from '../hooks/useLearningPath';
import { nextOpenDay } from '../lib/learningPath';
import { useHubTranslation } from '../registerHubTranslations';

/**
 * The wide button under the days.
 *
 * @param props.steps - the seven days
 * @returns the link
 */
function ContinueLink({ steps }: { steps: LearningStep[] }) {
  const { t } = useHubTranslation();
  const nextDay = nextOpenDay(steps);
  const hasStarted = steps.some((step) => step.isDone);
  // Step 1: the words: every day done, somewhere in the middle, or not started.
  let label = t('hub.path.start');
  if (nextDay === null) label = t('hub.path.readAgain');
  else if (hasStarted) label = t('hub.path.continue', { day: nextDay });
  return (
    <Link
      to={`/hub/path?day=${nextDay ?? 1}`}
      className={buttonClassName({ variant: 'secondary' }, 'w-full')}
    >
      {label}
    </Link>
  );
}

/**
 * One day's column.
 *
 * @param props.step - the day
 * @param props.isNext - whether it is the next open day (outlined)
 * @returns the list item
 */
function DayColumn({ step, isNext }: { step: LearningStep; isNext: boolean }) {
  const { t, i18n } = useHubTranslation();
  // Done, the next open day, or still to come: in words for screen readers, as well as the look.
  let state = t('hub.path.notStarted');
  if (step.isDone) state = t('hub.path.done');
  else if (isNext) state = t('hub.path.next');
  return (
    <li className="w-28 flex-none snap-start sm:w-auto">
      <Link
        to={`/hub/path?day=${step.day}`}
        aria-current={isNext ? 'step' : undefined}
        className={cn(
          'flex h-full min-h-[104px] flex-col gap-2 rounded-card border p-3 no-underline hover:underline',
          isNext ? 'border-2 border-primary bg-surface' : 'box-surface',
        )}
      >
        <span className="flex items-center justify-between type-meta font-semibold text-ink-muted">
          {t('hub.path.dayNumber', { day: step.day })}
          {step.isDone && <CheckIcon aria-hidden="true" className="text-primary" />}
        </span>
        <span
          className={cn(
            'type-body leading-[19px] wrap-anywhere',
            step.isDone || isNext ? 'font-semibold text-ink-heading' : 'text-ink-muted',
          )}
        >
          {i18n.language === 'ro' ? step.titleRo : step.titleEn}
        </span>
        <span className="sr-only">({state})</span>
      </Link>
    </li>
  );
}

/**
 * Renders the path.
 *
 * @returns the section, or nothing when staff have not written the days yet
 */
export function HubPath() {
  const { t } = useHubTranslation();
  const { steps, loadFailed } = useLearningPath();
  if (loadFailed) return <Notice tone="error">{t('hub.path.loadFailed')}</Notice>;
  if (steps.length === 0) return null;
  const nextDay = nextOpenDay(steps);
  return (
    <section aria-labelledby="hub-path" className="flex flex-col gap-3">
      <h2 id="hub-path" className="m-0 type-heading">
        {t('hub.path.heading')}
      </h2>
      <p className="m-0 text-ink-muted">{t('hub.path.intro')}</p>
      {/* Seven columns from 640 px; below that the days swipe sideways (story 1.3). */}
      <ol
        aria-label={t('hub.path.listLabel')}
        className="m-0 flex list-none snap-x snap-mandatory gap-2 overflow-x-auto p-0 sm:grid sm:grid-cols-7 sm:overflow-visible"
      >
        {steps.map((step) => (
          <DayColumn key={step.day} step={step} isNext={step.day === nextDay} />
        ))}
      </ol>
      <ContinueLink steps={steps} />
    </section>
  );
}
