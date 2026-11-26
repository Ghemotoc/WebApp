/**
 * StoryAtlasPage: /plan/s/:storySlug, one story's at-a-glance page in Story Atlas (stories
 * S1-E17-01 to S1-E17-06).
 *
 * The same story as in the writer section (one story, two sides): the top bar with the story
 * switcher and "Write", the story's title, then "The story", the words against the target and
 * the chapters, then the details (each saving by itself), the linked project and Delete (the
 * same two-step delete as Story settings, S1-E3-05). Only the writer sees any of it.
 * Who calls it: src/app/router.tsx (loaded only when a writer opens it). What it calls:
 * useStoryPlan → story_plan(); useMyStories for the switcher, "Write" (lib/writeAddress.ts) and
 * Delete;
 * useResumeAtlasSection, which moves an address ending ?resume to the section the writer had open
 * last (design books item 17).
 */
import { useParams } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { useSession } from '@/features/auth/hooks/useSession';
import type { MyStory } from '@/features/writing/api/stories';
import { useMyStories } from '@/features/writing/hooks/useMyStories';

import type { StoryPlanPage } from '../api/storyPlans';
import { useStoryPlan } from '../hooks/useStoryPlan';
import { useResumeAtlasSection } from '../hooks/useLastAtlasSection';
import { writeAddressFor } from '../lib/writeAddress';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { AtlasFrame } from './AtlasFrame';
import { AtAGlance } from './AtAGlance';

/** What shows under the bar: a wait, a plain message or the page. */
function AtlasBody({
  isSignedIn,
  page,
  loadFailed,
  story,
}: {
  isSignedIn: boolean;
  page: StoryPlanPage | null | undefined;
  loadFailed: boolean;
  story: MyStory | undefined;
}) {
  const { t } = useAtlasTranslation();
  if (!isSignedIn) return <p className="m-0 text-ink-muted">{t('signedOut')}</p>;
  if (loadFailed) return <Notice tone="error">{t('loadFailed')}</Notice>;
  if (page === undefined) return null;
  if (page === null) return <Notice tone="error">{t('notFound')}</Notice>;
  return <AtAGlance page={page} story={story} />;
}

/**
 * Renders the page.
 *
 * @returns the at-a-glance page, a wait or a plain message
 */
export function StoryAtlasPage() {
  const { t } = useAtlasTranslation();
  const { storySlug = '' } = useParams();
  const { userId, isKnown } = useSession();
  const { page, loadFailed } = useStoryPlan(storySlug);
  const { stories } = useMyStories();
  const story = stories.find((candidate) => candidate.slug === storySlug);

  // A link from outside the Atlas (?resume) opens the section the writer had open last (item 17).
  const isResuming = useResumeAtlasSection(storySlug);

  if (!isKnown || isResuming) return null;
  return (
    <AtlasFrame
      slug={storySlug}
      writeAddress={writeAddressFor(story)}
      section="glance"
      showsChrome={userId !== null}
    >
      <title>
        {page ? t('documentTitle', { title: page.story.title }) : t('homeDocumentTitle')}
      </title>
      <AtlasBody isSignedIn={userId !== null} page={page} loadFailed={loadFailed} story={story} />
    </AtlasFrame>
  );
}
