/**
 * MarketingFields: every field of the Marketing page (story S1-E17-29: "one place for my
 * logline, back-cover blurb, genre, audience, comparable titles, hooks and keywords, query
 * pitch, publishing route and launch notes"; "when I edit any field, then it saves by itself").
 *
 * Two cards. "The pitch": the logline and publishing route (the plan's own, the same fields as
 * At a glance), the genre and audience (the story's own, the same as Story settings), then the
 * blurb, comparable titles and hooks. "Getting it out": the query pitch and launch notes.
 * Who uses it: MarketingPage. What it calls: the savers it is given (useStoryPlan and
 * useStoryMarketing) and useStoryChoiceOptions.
 */
import { FormSection } from '@/features/writing/components/FormSection';

import type { MarketingNotes } from '../api/marketing';
import {
  publishingRoutes,
  type PlanFields,
  type StoryField,
  type StoryPlanPage,
} from '../api/storyPlans';
import { useStoryChoiceOptions } from '../hooks/useStoryChoiceOptions';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { PlanSelectField } from './PlanSelectField';
import { PlanTextField } from './PlanTextField';

/** What the fields need. */
export interface MarketingFieldsProps {
  page: StoryPlanPage;
  notes: MarketingNotes;
  savePlan: <Field extends keyof PlanFields>(
    field: Field,
    value: PlanFields[Field],
  ) => Promise<void>;
  saveStory: (field: StoryField, value: string) => Promise<void>;
  saveNote: (field: keyof MarketingNotes, value: string) => Promise<void>;
}

/** Each marketing note's longest length, as the database allows (…_s1_e17_27_…sql). */
const noteLengths: Record<keyof MarketingNotes, number> = {
  back_cover_blurb: 3000,
  comparable_titles: 1000,
  hooks_keywords: 1000,
  query_pitch: 3000,
  launch_notes: 5000,
};

/** One marketing note's box, labelled and hinted from the locale files. */
function NoteField({
  field,
  notes,
  saveNote,
}: {
  field: keyof MarketingNotes;
  notes: MarketingNotes;
  saveNote: MarketingFieldsProps['saveNote'];
}) {
  const { t } = useAtlasTranslation();
  return (
    <PlanTextField
      id={`atlas-marketing-${field}`}
      label={t(`marketing.fields.${field}`)}
      hint={t(`marketing.hints.${field}`)}
      isMultiline
      maxLength={noteLengths[field]}
      savedValue={notes[field]}
      save={async (value) => saveNote(field, value)}
    />
  );
}

/** The genre, audience and publishing route drop-downs, side by side. */
function MarketingChoices({
  page,
  savePlan,
  saveStory,
}: Omit<MarketingFieldsProps, 'notes' | 'saveNote'>) {
  const { t } = useAtlasTranslation();
  const { genreOptions, audienceOptions } = useStoryChoiceOptions();
  return (
    <div className="flex flex-wrap gap-x-8 gap-y-2">
      {genreOptions.length > 0 && (
        <PlanSelectField
          id="atlas-marketing-genre"
          label={t('details.genre')}
          options={genreOptions}
          savedValue={page.story.categorySlug}
          save={async (slug) => saveStory('categorySlug', slug)}
        />
      )}
      <PlanSelectField
        id="atlas-marketing-audience"
        label={t('details.audience')}
        options={audienceOptions}
        savedValue={page.story.rating}
        save={async (rating) => saveStory('rating', rating)}
      />
      <PlanSelectField
        id="atlas-marketing-route"
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
 * Renders the two cards.
 *
 * @returns "The pitch" and "Getting it out"
 */
export function MarketingFields(props: MarketingFieldsProps) {
  const { t } = useAtlasTranslation();
  const { page, notes, savePlan, saveNote } = props;
  return (
    <>
      <FormSection legend={t('marketing.pitchHeading')}>
        <p className="m-0 text-sm text-meta">{t('marketing.sharedHint')}</p>
        <PlanTextField
          id="atlas-marketing-logline"
          label={t('details.logline')}
          hint={t('details.loglineHint')}
          isMultiline
          maxLength={400}
          savedValue={page.plan.logline}
          save={async (logline) => savePlan('logline', logline)}
        />
        <MarketingChoices {...props} />
        <NoteField field="back_cover_blurb" notes={notes} saveNote={saveNote} />
        <NoteField field="comparable_titles" notes={notes} saveNote={saveNote} />
        <NoteField field="hooks_keywords" notes={notes} saveNote={saveNote} />
      </FormSection>
      <FormSection legend={t('marketing.launchHeading')}>
        <NoteField field="query_pitch" notes={notes} saveNote={saveNote} />
        <NoteField field="launch_notes" notes={notes} saveNote={saveNote} />
      </FormSection>
    </>
  );
}
