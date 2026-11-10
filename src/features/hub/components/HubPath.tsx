/**
 * HubPath: "Learning path" on the Writers' hub (bundle GAPS-12g; board WritersHub: "Your first
 * chapter in 7 days · A short lesson and a small task each day", the numbered steps and
 * "Continue day 3").
 *
 * The seven days with a tick on the ones the writer finished, and one button: "Start day 1"
 * before any tick, "Continue day N" for the first day still open, or "Read the path again" once
 * every day is done. The lessons open at /hub/path.
 * Who shows it: WritersHubPage. What it calls: useLearningPath and PathStepList.
 */
import { Link } from 'react-router';

import { Notice } from '@/components/ui/Notice';

import type { LearningStep } from '../api/hubPath';
import { useLearningPath } from '../hooks/useLearningPath';
import { nextOpenDay } from '../lib/learningPath';
import { useHubTranslation } from '../registerHubTranslations';

import { PathStepList } from './PathStepList';

/**
 * The card's one button, worded for how far the writer is.
 *
 * @param props.steps - the days with the writer's ticks
 * @returns the link styled as a button
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
      className="inline-flex h-11 items-center justify-center self-start rounded-full button-glass px-5 text-sm font-semibold no-underline"
    >
      {label}
    </Link>
  );
}

/**
 * Renders the card.
 *
 * @returns the card, a plain message when the path can't be read, or nothing while it loads
 */
export function HubPath() {
  const { t } = useHubTranslation();
  const { steps, loadFailed } = useLearningPath();
  if (loadFailed) return <Notice tone="error">{t('hub.path.loadFailed')}</Notice>;
  if (steps.length === 0) return null;
  const doneCount = steps.filter((step) => step.isDone).length;
  return (
    <section
      aria-labelledby="hub-path"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-card md:p-8"
    >
      <div className="flex flex-col gap-1.5">
        <p className="eyebrow m-0">{t('hub.path.eyebrow')}</p>
        <h2
          id="hub-path"
          className="m-0 font-heading text-[26px] leading-tight font-bold text-heading"
        >
          {t('hub.path.heading')}
        </h2>
        <p className="m-0 text-body">{t('hub.path.intro')}</p>
      </div>
      <PathStepList steps={steps} currentDay={null} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <ContinueLink steps={steps} />
        <span className="text-sm text-meta">
          {t('hub.path.progress', { done: doneCount, total: steps.length })}
        </span>
      </div>
    </section>
  );
}
