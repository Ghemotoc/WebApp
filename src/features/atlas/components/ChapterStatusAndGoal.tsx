/**
 * ChapterStatusAndGoal: the chapter's planning status and its word goal side by side, with the
 * goal's progress as "240 of 1,500 words" and a meter (CALM-9, board D05 "Chapter editor": "then
 * Status and the word goal side by side").
 *
 * The status saves the moment it is picked; the goal saves when the box is left and waits with a
 * plain message while it isn't a number (lib/optionalNumbers.ts). The progress shows only once
 * the chapter has a goal. Who uses it: ChapterPlanPanel. What it calls: the save prop
 * (useChapterPlan's saveFields).
 */
import {
  planningStatuses,
  type ChapterPlanChange,
  type ChapterPlanFields,
} from '../api/chapterPlans';
import { chapterTargetFrom } from '../lib/optionalNumbers';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { PlanSelectField } from './PlanSelectField';
import { PlanTextField } from './PlanTextField';

/** What the pair needs. */
export interface ChapterStatusAndGoalProps {
  fields: ChapterPlanFields;
  /** The words in the chapter text now, from the editor; null where the editor isn't open. */
  wordCount: number | null;
  save: (change: ChapterPlanChange) => Promise<void>;
}

/** "240 of 1,500 words" and a meter, for a chapter with a goal. */
function GoalProgress({ wordCount, goal }: { wordCount: number; goal: number }) {
  const { t, i18n } = useAtlasTranslation();
  const numbers = new Intl.NumberFormat(i18n.language);
  const label = t('chapterPlan.goalProgress', {
    words: numbers.format(wordCount),
    goal: numbers.format(goal),
  });
  return (
    <div className="flex flex-col gap-1.5">
      <p className="m-0 text-[13px] font-semibold text-heading">{label}</p>
      {/* A real meter, named by the line above, so a screen reader hears the same words. */}
      <meter
        aria-label={label}
        min={0}
        max={goal}
        value={Math.min(wordCount, goal)}
        className="h-1.5 w-full"
      />
    </div>
  );
}

/**
 * Renders the status, the goal and the progress.
 *
 * @returns the two fields side by side (stacked when the side column is narrow)
 */
export function ChapterStatusAndGoal({ fields, wordCount, save }: ChapterStatusAndGoalProps) {
  const { t } = useAtlasTranslation();
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] items-start gap-x-4 gap-y-2">
      <PlanSelectField
        id="atlas-chapter-status"
        label={t('chapterPlan.status')}
        options={planningStatuses.map((status) => ({
          value: status,
          label: t(`chapterPlan.statuses.${status}`),
        }))}
        savedValue={fields.planningStatus}
        save={async (value) =>
          save({ planning_status: value as ChapterPlanChange['planning_status'] })
        }
      />
      <div className="flex flex-col gap-2">
        <PlanTextField
          id="atlas-chapter-target"
          label={t('chapterPlan.wordTarget')}
          savedValue={fields.wordTarget === null ? '' : String(fields.wordTarget)}
          isValid={(typed) => chapterTargetFrom(typed).isValid}
          invalidMessage={t('chapterPlan.wordTargetInvalid')}
          save={async (typed) => {
            const read = chapterTargetFrom(typed);
            if (read.isValid) await save({ word_target: read.value });
          }}
        />
        {fields.wordTarget !== null && wordCount !== null && (
          <GoalProgress wordCount={wordCount} goal={fields.wordTarget} />
        )}
      </div>
    </div>
  );
}
