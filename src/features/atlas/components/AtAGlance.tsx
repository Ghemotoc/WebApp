/**
 * AtAGlance: the body of a story's at-a-glance page (story S1-E17-06; bundle G10 ATLAS, part a:
 * the liquid glass board AtlasStory), under the Story Atlas top bar.
 *
 * "At a glance" with "Only you can see this plan.", then two columns that stack on a phone. The
 * main column: "The story" card with the cover, the Words and Chapters tiles side by side, the
 * details (each saving by itself) and the linked project. The side column: the characters and the
 * chapters edited last, the writer's own character fields and Delete, with its red edge.
 * Who uses it: StoryAtlasPage. What it calls: useStoryPlan for the savers; the section components.
 */
import { DeleteStoryControl } from '@/features/writing/components/DeleteStoryControl';
import type { MyStory } from '@/features/writing/api/stories';

import type { StoryPlanPage } from '../api/storyPlans';
import { useStoryPlan } from '../hooks/useStoryPlan';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { AtlasPageHeading } from './AtlasPageHeading';
import { CastAtAGlance } from './CastAtAGlance';
import { ChaptersAtAGlance } from './ChaptersAtAGlance';
import { CharacterFieldsSection } from './CharacterFieldsSection';
import { LinkedProjectSection } from './LinkedProjectSection';
import { RecentChaptersList } from './RecentChaptersList';
import { StoryDetailsSection } from './StoryDetailsSection';
import { StorySummary } from './StorySummary';
import { WordsProgress } from './WordsProgress';

/** "Delete this story": the same two-step delete as Story settings (S1-E17-05, S1-E3-05). */
function DeleteSection({ story }: { story: MyStory }) {
  const { t } = useAtlasTranslation();
  return (
    <section
      aria-labelledby="atlas-delete-heading"
      className="flex min-w-0 flex-col gap-3 rounded-card border border-destructive/35 bg-surface px-6 py-[22px] shadow-card"
    >
      <h2 id="atlas-delete-heading" className="m-0 font-heading text-[22px] font-bold text-heading">
        {t('delete.heading')}
      </h2>
      <p className="m-0 text-sm text-meta">{t('delete.note')}</p>
      <DeleteStoryControl story={story} />
    </section>
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
    <>
      <AtlasPageHeading title={t('atAGlance')} />
      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
        {/* The main column: the story, its numbers, its details and the linked project. */}
        <div className="flex min-w-0 flex-col gap-5">
          <StorySummary page={page} story={story} />
          <div className="grid gap-5 sm:grid-cols-2">
            <WordsProgress
              wordsWritten={page.chapters.wordsWritten}
              wordTarget={page.plan.wordTarget}
            />
            <ChaptersAtAGlance page={page} />
          </div>
          <StoryDetailsSection page={page} saveStory={saveStory} savePlan={savePlan} />
          <LinkedProjectSection page={page} savePlan={savePlan} />
        </div>
        {/* The side column: what changed last, the writer's own fields and Delete. */}
        <aside aria-label={t('glanceAside')} className="flex min-w-0 flex-col gap-5">
          <CastAtAGlance page={page} />
          <RecentChaptersList page={page} />
          <CharacterFieldsSection slug={page.story.slug} />
          {story !== undefined && <DeleteSection story={story} />}
        </aside>
      </div>
    </>
  );
}
