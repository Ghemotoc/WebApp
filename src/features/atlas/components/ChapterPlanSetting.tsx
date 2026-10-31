/**
 * ChapterPlanSetting: a chapter's word target, in-world date and sort value, location and summary
 * (story S1-E17-24), each saving by itself.
 *
 * An empty word target or sort value means none; anything that isn't a number waits with a plain
 * message (lib/optionalNumbers.ts). Who uses it: ChapterPlanPanel. What it calls: the save prop
 * (useChapterPlan's saveFields).
 */
import type { ChapterPlanChange, ChapterPlanFields } from '../api/chapterPlans';
import { chapterTargetFrom, sortValueFrom } from '../lib/optionalNumbers';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { PlanTextField } from './PlanTextField';

/** What the fields need. */
export interface ChapterPlanSettingProps {
  fields: ChapterPlanFields;
  save: (change: ChapterPlanChange) => Promise<void>;
}

/** A number as the box shows it: empty for none. */
function boxText(value: number | null): string {
  return value === null ? '' : String(value);
}

/**
 * Renders the fields.
 *
 * @returns the target, date, sort value, location and summary boxes
 */
export function ChapterPlanSetting({ fields, save }: ChapterPlanSettingProps) {
  const { t } = useAtlasTranslation();
  return (
    <div className="flex flex-col gap-2">
      <PlanTextField
        id="atlas-chapter-target"
        label={t('chapterPlan.wordTarget')}
        hint={t('chapterPlan.wordTargetHint')}
        savedValue={boxText(fields.wordTarget)}
        isValid={(typed) => chapterTargetFrom(typed).isValid}
        invalidMessage={t('chapterPlan.wordTargetInvalid')}
        save={async (typed) => {
          const read = chapterTargetFrom(typed);
          if (read.isValid) await save({ word_target: read.value });
        }}
      />
      <PlanTextField
        id="atlas-chapter-world-date"
        label={t('chapterPlan.worldDate')}
        hint={t('chapterPlan.worldDateHint')}
        savedValue={fields.worldDate}
        maxLength={80}
        save={async (value) => save({ world_date: value })}
      />
      <PlanTextField
        id="atlas-chapter-world-sort"
        label={t('chapterPlan.worldSort')}
        hint={t('chapterPlan.worldSortHint')}
        savedValue={boxText(fields.worldSort)}
        isValid={(typed) => sortValueFrom(typed).isValid}
        invalidMessage={t('chapterPlan.worldSortInvalid')}
        save={async (typed) => {
          const read = sortValueFrom(typed);
          if (read.isValid) await save({ world_sort: read.value });
        }}
      />
      <PlanTextField
        id="atlas-chapter-location"
        label={t('chapterPlan.location')}
        savedValue={fields.location}
        maxLength={200}
        save={async (value) => save({ location: value })}
      />
      <PlanTextField
        id="atlas-chapter-summary"
        label={t('chapterPlan.summary')}
        savedValue={fields.summary}
        isMultiline
        maxLength={5000}
        save={async (value) => save({ summary: value })}
      />
    </div>
  );
}
