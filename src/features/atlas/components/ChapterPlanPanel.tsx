/**
 * ChapterPlanPanel: the planning fields beside the chapter editor (stories S1-E17-23: "the
 * planning fields in a side panel (stacked on a phone)"; S1-E17-24 and S1-E17-25).
 *
 * In the order of CALM-9's board D05: the summary; the status and the word goal side by side
 * ("240 of 1,500 words" with a meter); the characters present with a "+ Add" chip; then, folded
 * under "More details", the type, point of view, act, in-world date, location and scenes.
 * Everything saves by itself and none of it shows to readers. Who uses it: ChapterEditorPage (src/features/writing), hidden in focus mode.
 * What it calls: useChapterPlan → chapter_plan() and the change functions.
 */
import { Link } from 'react-router';

import { Notice } from '@/components/ui/Notice';

import { useChapterPlan } from '../hooks/useChapterPlan';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { ChapterPlanMoreDetails } from './ChapterPlanMoreDetails';
import { ChapterStatusAndGoal } from './ChapterStatusAndGoal';
import { PlanTextField } from './PlanTextField';
import { PresentCharacterChips } from './PresentCharacterChips';

/** What the panel needs. */
export interface ChapterPlanPanelProps {
  slug: string;
  chapterCode: string;
  /** The words in the chapter text now, for the goal's progress; leave out where none is open. */
  wordCount?: number;
}

/**
 * Renders the panel.
 *
 * @returns the card with every planning field, or a plain message while it can't
 */
export function ChapterPlanPanel({ slug, chapterCode, wordCount }: ChapterPlanPanelProps) {
  const { t } = useAtlasTranslation();
  const changers = useChapterPlan(slug, chapterCode);
  const { plan } = changers;
  return (
    <section
      aria-labelledby="atlas-chapter-plan-heading"
      data-testid="atlas-chapter-plan"
      className="flex min-w-0 flex-col gap-4 rounded-card border border-border bg-surface px-6 py-6 shadow-card"
    >
      <div className="flex flex-col gap-1">
        <h2
          id="atlas-chapter-plan-heading"
          className="m-0 font-heading text-[22px] font-bold text-heading"
        >
          {t('chapterPlan.heading')}
        </h2>
        <p className="m-0 text-sm text-meta">{t('chapterPlan.privateNote')}</p>
        <Link to={`/plan/s/${slug}`} className="text-sm font-semibold">
          {t('chapterPlan.openPlan')}
        </Link>
      </div>
      {changers.loadFailed && <Notice tone="error">{t('chapterPlan.loadFailed')}</Notice>}
      {plan !== undefined && plan !== null && (
        <>
          <PlanTextField
            id="atlas-chapter-summary"
            label={t('chapterPlan.summary')}
            savedValue={plan.fields.summary}
            isMultiline
            maxLength={5000}
            save={async (value) => changers.saveFields({ summary: value })}
          />
          <ChapterStatusAndGoal
            fields={plan.fields}
            wordCount={wordCount ?? null}
            save={changers.saveFields}
          />
          <PresentCharacterChips slug={slug} plan={plan} setPresent={changers.setPresent} />
          <ChapterPlanMoreDetails plan={plan} changers={changers} />
        </>
      )}
    </section>
  );
}
