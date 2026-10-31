/**
 * PublicTimeline: the in-world events a writer shares, in order (story S1-E17-33).
 *
 * Each event shows its date as the writer wrote it, its title and its text with [[Name]] links
 * that open only public items (S1-E17-32), with the shared Report button (S1-E17-34); the
 * preview leaves the buttons out and marks events waiting for a chapter.
 * Who uses it: PublicPlanView. What it calls: CrossLinkText, ReportButton and PlanGuardPill.
 */
import { ReportButton } from '@/features/reporting/components/ReportButton';

import type { PublicPlan } from '../api/publicPlan';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { CrossLinkText } from './CrossLinkText';
import { PlanGuardPill } from './PlanGuardPill';

/**
 * Renders the events.
 *
 * @param props.plan - the public plan
 * @param props.isPreview - true in the writer's preview
 * @returns the ordered list, or a plain line when nothing is shown
 */
export function PublicTimeline({ plan, isPreview }: { plan: PublicPlan; isPreview: boolean }) {
  const { t } = useAtlasTranslation();
  if (plan.events.length === 0)
    return <p className="m-0 text-body">{t('publicPlan.timeline.none')}</p>;
  return (
    <ol className="m-0 flex list-none flex-col rounded-card border border-border bg-surface px-5 py-2 shadow-card md:px-7">
      {plan.events.map((event) => (
        <li
          key={event.id}
          data-testid="atlas-public-event"
          className="flex flex-col gap-2 border-b border-hairline py-4 last:border-b-0"
        >
          <div className="flex flex-wrap items-center gap-2">
            {event.displayDate !== '' && (
              <span className="text-sm text-meta">{event.displayDate}</span>
            )}
            <PlanGuardPill guard={event.showFrom} />
          </div>
          <h2 className="m-0 font-heading text-lg font-bold break-words text-heading">
            {event.title}
          </h2>
          {event.description !== '' && (
            <p className="m-0 text-sm break-words whitespace-pre-line text-body">
              <CrossLinkText text={event.description} />
            </p>
          )}
          {!isPreview && (
            <div className="self-start">
              <ReportButton
                itemType="atlas_item"
                itemReference={event.id}
                itemLabel={event.title}
              />
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
