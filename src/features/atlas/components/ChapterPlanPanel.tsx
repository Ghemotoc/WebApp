/**
 * ChapterPlanPanel: the planning fields beside the chapter editor (stories S1-E17-23: "the
 * planning fields in a side panel (stacked on a phone)"; S1-E17-24 and S1-E17-25).
 *
 * The chapter's type, status, point of view and act, its word target, in-world date, location
 * and summary, the characters present and its scenes; everything saves by itself and none of it
 * shows to readers. Who uses it: ChapterEditorPage (src/features/writing), hidden in focus mode.
 * What it calls: useChapterPlan → chapter_plan() and the change functions.
 */
import { Link } from 'react-router';

import { Notice } from '@/components/ui/Notice';

import { useChapterPlan } from '../hooks/useChapterPlan';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { ChapterPlanBasics } from './ChapterPlanBasics';
import { ChapterPlanSetting } from './ChapterPlanSetting';
import { ChapterScenesSection } from './ChapterScenesSection';
import { PresentCharacterChips } from './PresentCharacterChips';

/** What the panel needs. */
export interface ChapterPlanPanelProps {
  slug: string;
  chapterCode: string;
}

/**
 * Renders the panel.
 *
 * @returns the card with every planning field, or a plain message while it can't
 */
export function ChapterPlanPanel({ slug, chapterCode }: ChapterPlanPanelProps) {
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
          <ChapterPlanBasics plan={plan} save={changers.saveFields} />
          <ChapterPlanSetting fields={plan.fields} save={changers.saveFields} />
          <PresentCharacterChips slug={slug} plan={plan} setPresent={changers.setPresent} />
          <ChapterScenesSection
            plan={plan}
            addScene={changers.addScene}
            saveScene={changers.saveScene}
            moveScene={changers.moveScene}
            removeScene={changers.removeScene}
          />
        </>
      )}
    </section>
  );
}
