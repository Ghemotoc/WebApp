/**
 * StoryDetailsSection: "Story details" on the at-a-glance page (story S1-E17-03).
 *
 * The title, genre and audience are the story's own (its title, category and rating from New
 * story and Story settings, S1-E3-01 and S1-E3-06), so a change here is the same change there
 * (one place for both sides). The logline, series name, word target, writing status and
 * publishing route are the plan's own and private. Every field saves by itself.
 * Who uses it: StoryAtlasPage. What it calls: useStoryPlan's saveStory and savePlan, and
 * useStoryChoiceOptions for the genres and audiences.
 */
import { FormSection } from '@/features/writing/components/FormSection';

import {
  publishingRoutes,
  writingStatuses,
  type PlanFields,
  type StoryField,
  type StoryPlanPage,
} from '../api/storyPlans';
import { useStoryChoiceOptions } from '../hooks/useStoryChoiceOptions';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { PlanSelectField } from './PlanSelectField';
import { PlanTextField } from './PlanTextField';
import { WordTargetField } from './WordTargetField';

/** Saves one of the plan's own fields. */
type SavePlan = <Field extends keyof PlanFields>(
  field: Field,
  value: PlanFields[Field],
) => Promise<void>;

/** What the section needs. */
export interface StoryDetailsSectionProps {
  page: StoryPlanPage;
  saveStory: (field: StoryField, value: string) => Promise<void>;
  savePlan: SavePlan;
}

/** The title, genre and audience: the story's own fields, shared with Story settings. */
function StoryOwnFields({ page, saveStory }: Omit<StoryDetailsSectionProps, 'savePlan'>) {
  const { t } = useAtlasTranslation();
  const { genreOptions, audienceOptions } = useStoryChoiceOptions();
  return (
    <>
      <p className="m-0 text-sm text-meta">{t('details.sharedHint')}</p>
      <PlanTextField
        id="atlas-title"
        label={t('details.title')}
        maxLength={120}
        isValid={(title) => title.trim() !== ''}
        invalidMessage={t('details.titleRequired')}
        savedValue={page.story.title}
        save={async (title) => saveStory('title', title)}
      />
      <div className="flex flex-wrap gap-x-8 gap-y-2">
        {genreOptions.length > 0 && (
          <PlanSelectField
            id="atlas-genre"
            label={t('details.genre')}
            options={genreOptions}
            savedValue={page.story.categorySlug}
            save={async (slug) => saveStory('categorySlug', slug)}
          />
        )}
        <PlanSelectField
          id="atlas-audience"
          label={t('details.audience')}
          options={audienceOptions}
          savedValue={page.story.rating}
          save={async (rating) => saveStory('rating', rating)}
        />
      </div>
    </>
  );
}

/** The writing status and publishing route drop-downs: the plan's own. */
function PlanChoiceFields({ page, savePlan }: Omit<StoryDetailsSectionProps, 'saveStory'>) {
  const { t } = useAtlasTranslation();
  return (
    <div className="flex flex-wrap gap-x-8 gap-y-2">
      <PlanSelectField
        id="atlas-writing-status"
        label={t('details.writingStatus')}
        options={writingStatuses.map((status) => ({
          value: status,
          label: t(`writingStatus.${status}`),
        }))}
        savedValue={page.plan.writingStatus}
        save={async (status) => savePlan('writingStatus', status as PlanFields['writingStatus'])}
      />
      <PlanSelectField
        id="atlas-publishing-route"
        label={t('details.publishingRoute')}
        options={publishingRoutes.map((route) => ({
          value: route,
          label: t(`publishingRoute.${route}`),
        }))}
        savedValue={page.plan.publishingRoute}
        save={async (route) => savePlan('publishingRoute', route as PlanFields['publishingRoute'])}
      />
    </div>
  );
}

/**
 * Renders the section.
 *
 * @returns the "Story details" card
 */
export function StoryDetailsSection({ page, saveStory, savePlan }: StoryDetailsSectionProps) {
  const { t } = useAtlasTranslation();
  return (
    <FormSection legend={t('details.heading')}>
      <StoryOwnFields page={page} saveStory={saveStory} />
      <PlanTextField
        id="atlas-logline"
        label={t('details.logline')}
        hint={t('details.loglineHint')}
        isMultiline
        maxLength={400}
        savedValue={page.plan.logline}
        save={async (logline) => savePlan('logline', logline)}
      />
      <PlanTextField
        id="atlas-series-name"
        label={t('details.seriesName')}
        maxLength={120}
        savedValue={page.plan.seriesName}
        save={async (name) => savePlan('seriesName', name)}
      />
      <WordTargetField
        savedTarget={page.plan.wordTarget}
        save={async (target) => savePlan('wordTarget', target)}
      />
      <PlanChoiceFields page={page} savePlan={savePlan} />
    </FormSection>
  );
}
