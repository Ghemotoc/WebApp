/**
 * ChapterPlanPanel: the planning fields beside the chapter editor (stories S1-E17-23: "the
 * planning fields in a side panel (stacked on a phone)"; S1-E17-24 and S1-E17-25).
 *
 * In the order of CALM-9's board D05: the summary; the status and the word goal side by side
 * ("240 of 1,500 words" with a meter); the characters present with a "+ Add" chip; then, folded
 * under "More details", the type, point of view, act, in-world date, location and scenes.
 * Everything saves by itself and none of it shows to readers.
 * The head, as board D05 draws it: "Plan for this chapter" in the subheading type with Close ×
 * at the right (the plan closes to a button, user story 5.5), then "Only you see this. Readers
 * never do. Open the story's plan" in the meta type. Inside the phone sheet (variant "sheet") the
 * sheet already carries the title and Close, so the panel starts at the note and draws no card.
 * Who uses it: ChapterEditorPage (src/features/writing), hidden in focus mode.
 * What it calls: useChapterPlan → chapter_plan() and the change functions.
 */
import { Link } from 'react-router';

import { CrossIcon } from '@/components/icons/CrossIcon';

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
  /** "side": a card beside the paper with its own head and Close; "sheet": inside a Sheet. */
  variant?: 'side' | 'sheet';
  /** Closes the plan to its button (the side card's Close ×). */
  onClose?: () => void;
}

/** The side card's head: the heading and Close × (board D05). */
function PanelHead({ onClose }: { onClose?: () => void }) {
  const { t } = useAtlasTranslation();
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 id="atlas-chapter-plan-heading" className="m-0 type-subheading text-ink-heading">
        {t('chapterPlan.heading')}
      </h2>
      {onClose !== undefined && (
        <button
          type="button"
          aria-label={t('chapterPlan.close')}
          onClick={onClose}
          className="inline-flex size-11 items-center justify-center rounded-full text-ink-heading hover:bg-tint"
        >
          <CrossIcon />
        </button>
      )}
    </div>
  );
}

/** "Only you see this. Readers never do." and the way to the story's whole plan. */
function PrivateNote({ slug }: { slug: string }) {
  const { t } = useAtlasTranslation();
  return (
    <p className="m-0 type-meta text-ink-muted">
      {t('chapterPlan.privateNote')}{' '}
      {/* 24 px tall at least, the WCAG 2.5.8 target for a link inside a sentence. */}
      <Link to={`/plan/s/${slug}`} className="inline-block min-h-6 font-semibold">
        {t('chapterPlan.openPlan')}
      </Link>
    </p>
  );
}

/**
 * Renders the panel.
 *
 * @returns the card with every planning field, or a plain message while it can't
 */
export function ChapterPlanPanel(props: ChapterPlanPanelProps) {
  const { slug, chapterCode, wordCount, variant = 'side' } = props;
  const { t } = useAtlasTranslation();
  const changers = useChapterPlan(slug, chapterCode);
  const { plan } = changers;
  const isSide = variant === 'side';
  return (
    <section
      aria-labelledby={isSide ? 'atlas-chapter-plan-heading' : undefined}
      aria-label={isSide ? undefined : t('chapterPlan.heading')}
      data-testid="atlas-chapter-plan"
      className={
        isSide
          ? 'box-surface flex min-w-0 flex-col gap-3 rounded-card p-6'
          : 'flex min-w-0 flex-col gap-3'
      }
    >
      {isSide && <PanelHead onClose={props.onClose} />}
      <PrivateNote slug={slug} />
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
