/**
 * PathStepList: the learning path's seven days as a numbered list of links, each with its number
 * or a tick once done (bundle GAPS-12g; board WritersHub, the numbered steps of "Learning
 * path"). "Done" is also said in words for screen readers, so the tick is never the only sign.
 *
 * Who shows it: HubPath (on the hub) and LearningPathPage (beside the lesson, with the open day
 * marked). What it calls: nothing; the links open /hub/path?day=N.
 */
import { Link } from 'react-router';

import { CheckIcon } from '@/components/icons/CheckIcon';
import { cn } from '@/lib/utils';

import type { LearningStep } from '../api/hubPath';
import { useHubTranslation } from '../registerHubTranslations';

/** What the list needs. */
export interface PathStepListProps {
  steps: LearningStep[];
  /** The day open on the page, marked as the current one; null on the hub. */
  currentDay: number | null;
}

/**
 * Renders the list.
 *
 * @returns the ordered list
 */
export function PathStepList({ steps, currentDay }: PathStepListProps) {
  const { t, i18n } = useHubTranslation();
  return (
    <ol aria-label={t('hub.path.listLabel')} className="m-0 flex list-none flex-col p-0">
      {steps.map((step) => (
        <li key={step.day} className="border-b border-border last:border-b-0">
          <Link
            to={`/hub/path?day=${step.day}`}
            aria-current={step.day === currentDay ? 'step' : undefined}
            className={cn(
              'flex min-h-11 items-center gap-3 py-2 text-[15px] text-link no-underline hover:underline',
              step.day === currentDay && 'font-semibold',
            )}
          >
            <span
              aria-hidden="true"
              className="inline-flex size-7 flex-none items-center justify-center rounded-full border border-border text-[13px] font-bold text-heading"
            >
              {step.isDone ? <CheckIcon /> : step.day}
            </span>
            <span className="min-w-0 wrap-anywhere">
              <span className="sr-only">{t('hub.path.dayNumber', { day: step.day })} </span>
              {i18n.language === 'ro' ? step.titleRo : step.titleEn}
              {step.isDone && <span className="sr-only"> ({t('hub.path.done')})</span>}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
