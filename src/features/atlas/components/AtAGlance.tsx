/**
 * AtAGlance: the body of a story's at-a-glance page (story S1-E17-06; redrawn as board E21 in
 * user stories bundle 6), under the Story Atlas top bar.
 *
 * "At a glance" with "Only you can see this plan." under it, then the story card (the page's one
 * box: the story, its words and its chapters), then two flat columns that stack on a phone. The
 * wider left column: Story details, Linked project, Character fields and Delete this story. The
 * right column: the characters and the chapters edited last. Every part sits under a fine line.
 * Who uses it: StoryAtlasPage. What it calls: useStoryPlan for the savers; the section components.
 */
import { DeleteStoryControl } from '@/features/writing/components/DeleteStoryControl';
import type { MyStory } from '@/features/writing/api/stories';

import type { StoryPlanPage } from '../api/storyPlans';
import { useStoryPlan } from '../hooks/useStoryPlan';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { AtlasFlatSection } from './AtlasFlatSection';
import { AtlasPageHeading } from './AtlasPageHeading';
import { CastAtAGlance } from './CastAtAGlance';
import { CharacterFieldsSection } from './CharacterFieldsSection';
import { LinkedProjectSection } from './LinkedProjectSection';
import { RecentChaptersList } from './RecentChaptersList';
import { StoryDetailsSection } from './StoryDetailsSection';
import { StorySummary } from './StorySummary';

/** "Delete this story": the same two-step delete as Story settings (S1-E17-05, S1-E3-05). */
function DeleteSection({ story }: { story: MyStory }) {
  const { t } = useAtlasTranslation();
  return (
    <AtlasFlatSection headingId="atlas-delete-heading" heading={t('delete.heading')}>
      <p className="m-0 type-meta">{t('delete.note')}</p>
      <DeleteStoryControl story={story} />
    </AtlasFlatSection>
  );
}

/**
 * Renders the page body.
 *
 * @param props.page - the plan, from story_plan()
 * @param props.story - the same story from the writer's list (for Delete); undefined while loading
 * @returns the heading and the two rows
 */
export function AtAGlance({ page, story }: { page: StoryPlanPage; story: MyStory | undefined }) {
  const { t } = useAtlasTranslation();
  const { savePlan, saveStory } = useStoryPlan(page.story.slug);
  return (
    <div className="flex min-w-0 flex-col gap-8">
      <AtlasPageHeading title={t('atAGlance')} />
      <StorySummary page={page} story={story} />
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-12">
        {/* The left column: what the writer sets about the story. */}
        <div className="flex min-w-0 flex-col gap-8">
          <StoryDetailsSection page={page} saveStory={saveStory} savePlan={savePlan} />
          <LinkedProjectSection page={page} savePlan={savePlan} />
          <CharacterFieldsSection slug={page.story.slug} />
          {story !== undefined && <DeleteSection story={story} />}
        </div>
        {/* The right column: what changed last. */}
        <aside aria-label={t('glanceAside')} className="flex min-w-0 flex-col gap-8">
          <CastAtAGlance page={page} />
          <RecentChaptersList page={page} />
        </aside>
      </div>
    </div>
  );
}
