/**
 * AtAGlance: the body of a story's at-a-glance page (story S1-E17-06), under the Story Atlas
 * top bar.
 *
 * The title as the page heading with "Only you can see your plan", then two rows that stack on
 * a phone: "The story" beside the words and chapters, and the details beside the linked project
 * and Delete. Further parts of the bundle add the cast (part b), the chapters' planning status
 * and targets (part e) and the open questions and ideas (part g) to the first row.
 * Who uses it: StoryAtlasPage. What it calls: useStoryPlan for the savers; the section components.
 */
import { DeleteStoryControl } from '@/features/writing/components/DeleteStoryControl';
import type { MyStory } from '@/features/writing/api/stories';

import type { StoryPlanPage } from '../api/storyPlans';
import { useStoryPlan } from '../hooks/useStoryPlan';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { ChaptersAtAGlance } from './ChaptersAtAGlance';
import { LinkedProjectSection } from './LinkedProjectSection';
import { StoryDetailsSection } from './StoryDetailsSection';
import { StorySummary } from './StorySummary';
import { WordsProgress } from './WordsProgress';

/** "Delete this story": the same two-step delete as Story settings (S1-E17-05, S1-E3-05). */
function DeleteSection({ story }: { story: MyStory }) {
  const { t } = useAtlasTranslation();
  return (
    <section
      aria-labelledby="atlas-delete-heading"
      className="flex min-w-0 flex-col gap-3 rounded-card border border-border bg-surface px-7 py-[26px] shadow-card"
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
      <header className="flex flex-col gap-2">
        <h1 className="m-0 text-[clamp(36px,4.4vw,64px)] leading-[0.98] font-extrabold tracking-[-0.025em] break-words">
          {page.story.title}
        </h1>
        <p className="m-0 text-sm text-meta">
          {t('atAGlance')} · {t('privateNote')}
        </p>
      </header>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <StorySummary page={page} />
        <div className="flex min-w-0 flex-col gap-6">
          <WordsProgress
            wordsWritten={page.chapters.wordsWritten}
            wordTarget={page.plan.wordTarget}
          />
          <ChaptersAtAGlance page={page} />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <StoryDetailsSection page={page} saveStory={saveStory} savePlan={savePlan} />
        <div className="flex min-w-0 flex-col gap-6">
          <LinkedProjectSection page={page} savePlan={savePlan} />
          {story !== undefined && <DeleteSection story={story} />}
        </div>
      </div>
    </>
  );
}
