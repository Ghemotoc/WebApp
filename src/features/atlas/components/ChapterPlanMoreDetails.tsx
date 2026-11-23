/**
 * ChapterPlanMoreDetails: the fold "More details" at the end of a chapter's plan, closed at
 * first, holding the type, point of view, act, in-world date, location and scenes (CALM-9, board
 * D05: "Point of view, date, act, place and scenes fold under 'More details'").
 *
 * Why a native <details>: it opens by keyboard and tells screen readers whether it is open with
 * no extra code. Who uses it: ChapterPlanPanel. What it calls: the three sections it holds.
 */
import type { ChapterPlan } from '../api/chapterPlans';
import type { useChapterPlan } from '../hooks/useChapterPlan';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { ChapterPlanBasics } from './ChapterPlanBasics';
import { ChapterPlanSetting } from './ChapterPlanSetting';
import { ChapterScenesSection } from './ChapterScenesSection';

/** What the fold needs. */
export interface ChapterPlanMoreDetailsProps {
  plan: ChapterPlan;
  /** The change functions from useChapterPlan. */
  changers: ReturnType<typeof useChapterPlan>;
}

/**
 * Renders the fold.
 *
 * @returns the closed fold with its line and the fields inside
 */
export function ChapterPlanMoreDetails({ plan, changers }: ChapterPlanMoreDetailsProps) {
  const { t } = useAtlasTranslation();
  return (
    <details className="border-t border-border pt-3">
      <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-heading">
        {t('chapterPlan.moreDetails')}
      </summary>
      <div className="flex flex-col gap-4 pt-2">
        <p className="m-0 text-[13px] text-meta">{t('chapterPlan.moreDetailsLine')}</p>
        <ChapterPlanBasics plan={plan} save={changers.saveFields} />
        <ChapterPlanSetting fields={plan.fields} save={changers.saveFields} />
        <ChapterScenesSection
          plan={plan}
          addScene={changers.addScene}
          saveScene={changers.saveScene}
          moveScene={changers.moveScene}
          removeScene={changers.removeScene}
        />
      </div>
    </details>
  );
}
