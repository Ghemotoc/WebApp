/**
 * ChapterPlanBasics: a chapter's type, planning status, point of view and act (story S1-E17-24),
 * each a drop-down that saves the moment it is picked.
 *
 * Who uses it: ChapterPlanPanel. What it calls: the save prop (useChapterPlan's saveFields).
 */
import { chapterKinds, planningStatuses, type ChapterPlan } from '../api/chapterPlans';
import type { ChapterPlanChange } from '../api/chapterPlans';
import { narratorValue, pointOfViewChange, pointOfViewValue } from '../lib/pointOfView';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { PlanSelectField } from './PlanSelectField';

/** What the four pickers need. */
export interface ChapterPlanBasicsProps {
  plan: ChapterPlan;
  save: (change: ChapterPlanChange) => Promise<void>;
}

/**
 * Renders the four pickers.
 *
 * @returns the type, status, point-of-view and act drop-downs
 */
export function ChapterPlanBasics({ plan, save }: ChapterPlanBasicsProps) {
  const { t } = useAtlasTranslation();
  const { fields } = plan;
  // "None" first, then the Narrator (outside the story, G10c2), then the characters by name.
  const characterOptions = [
    { value: '', label: t('chapterPlan.none') },
    { value: narratorValue, label: t('chapterPlan.narratorOption') },
    ...plan.characters.map((character) => ({ value: character.id, label: character.name })),
  ];
  const actOptions = [
    { value: '', label: t('chapterPlan.none') },
    ...plan.acts.map((act) => ({ value: act.id, label: act.name })),
  ];
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      <PlanSelectField
        id="atlas-chapter-kind"
        label={t('chapterPlan.kind')}
        options={chapterKinds.map((kind) => ({
          value: kind,
          label: t(`chapterPlan.kinds.${kind}`),
        }))}
        savedValue={fields.kind}
        save={async (value) => save({ kind: value as ChapterPlanChange['kind'] })}
      />
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
      <PlanSelectField
        id="atlas-chapter-pov"
        label={t('chapterPlan.pov')}
        options={characterOptions}
        savedValue={pointOfViewValue(fields)}
        save={async (value) => save(pointOfViewChange(value))}
      />
      <PlanSelectField
        id="atlas-chapter-act"
        label={t('chapterPlan.act')}
        options={actOptions}
        savedValue={fields.actId ?? ''}
        save={async (value) => save({ act_id: value })}
      />
    </div>
  );
}
