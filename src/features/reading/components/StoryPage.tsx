/**
 * StoryPage: a story's public page, screen 3.4 (story S1-E3-05 starts it;
 * design/boards/Story.dc.html).
 *
 * Who shows it: the router, at /s/:storySlug; shared links, Your writing's "See story page" and,
 * later, Discover lead here.
 * What it shows today: the cover (220 × 308), the pills (category, Ongoing or Completed), the
 * title, "by <pen name>", the blurb, the tags, "Labels from the writer" (language, status) and
 * "Report this story". The owner sees a note while nothing is published yet. What joins later:
 * the chapter list, "Start reading" and "Updated" (S1-E3-03), the rating pill, labels and content
 * note (S1-E3-06), Follow, Library and Like (S1-E6-05, S1-E4-03, S1-E6-03), the writer card's
 * numbers and "See profile" (S1-E5-05), the breadcrumb (S1-E5-01), the wide ad slot under the
 * chapter list (S1-E12-01; none on a class-only story, Q70), "Web and app" (S1-E3-08), "The story's world" (the plan's public parts, S1-E17-33). Doodles:
 * the music notes under the cover (StoryHeader) and the mug and mushroom by
 * the side column, as on the board; the chapter card's book and puppy come with the list.
 * A signed-out visitor on a 16+ or 18+ story gets its title and NoPreviewNotice instead of "not
 * available" (S1-E4-04; they count as under 16, Q6).
 * What it calls: useStoryPage → get_story_page() (ADR 0004: never the tables); useStoryPreview →
 * get_link_preview() only when that answered nothing.
 */
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageAdSlot } from '@/features/ads/components/PageAdSlot';

import { useStoryPage } from '../hooks/useStoryPage';
import { useStoryPreview } from '../hooks/useStoryPreview';

import { NoPreviewNotice } from './NoPreviewNotice';
import { StoryChapterList } from './StoryChapterList';
import { CopiedWorkNote } from './CopiedWorkNote';
import { StoryHeader } from './StoryHeader';
import { StorySideColumn } from './StorySideColumn';
import { StoryWorldLinks } from './StoryWorldLinks';

/** "This story isn't available", with the way home. */
function StoryUnavailable() {
  const { t } = useTranslation('reading');
  return (
    <div className="flex flex-col items-start gap-3 rounded-card border border-border bg-surface px-8 py-10">
      <h1 className="m-0 font-heading text-[26px] font-bold text-heading">
        {t('storyPage.unavailableTitle')}
      </h1>
      <p className="m-0 text-base text-body">{t('storyPage.unavailableBody')}</p>
      <Link
        to="/"
        className="inline-flex h-11 items-center rounded-full button-main px-5 text-sm font-semibold no-underline"
      >
        {t('storyPage.goHome')}
      </Link>
    </div>
  );
}

/** When the story can't be shown: for a signed-out visitor on a 16+ or 18+ story, why. */
function StoryMissing({ storySlug }: { storySlug: string }) {
  const { t } = useTranslation('reading');
  const { hidden, isSettled } = useStoryPreview(storySlug, null, true);
  if (!isSettled) return null;
  if (hidden !== null) return <NoPreviewNotice preview={hidden} />;
  return (
    <>
      <title>{t('storyPage.unavailableTitle')}</title>
      <StoryUnavailable />
    </>
  );
}

/**
 * The page's one ad slot, chosen from the story's category and language only (S1-E12-01); the
 * server leaves it out on a class-only story (Q70).
 *
 * @param props.story - the story the page shows
 * @returns the slot, or nothing
 */
function StoryAdSlot({
  story,
}: {
  story: { slug: string; categorySlug: string; languageCode: string };
}) {
  return (
    <PageAdSlot
      pageKey="story"
      position={1}
      context={{
        storySlug: story.slug,
        category: story.categorySlug,
        language: story.languageCode,
      }}
    />
  );
}

/**
 * Renders the page.
 *
 * @returns the story screen, a wait, or "not available"
 */
export function StoryPage() {
  const { t } = useTranslation('reading');
  const { storySlug = '' } = useParams();
  const { story, isLoaded, loadFailed } = useStoryPage(storySlug);

  if (loadFailed) {
    return (
      <PageContainer className="pt-12 pb-7">
        <Notice tone="error">{t('storyPage.loadFailed')}</Notice>
      </PageContainer>
    );
  }
  if (!isLoaded) return null;
  if (story === null) {
    return (
      <PageContainer className="tmc-rise pt-12 pb-7">
        <StoryMissing storySlug={storySlug} />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="tmc-rise flex flex-col gap-8 pt-10 pb-7">
      <title>{t('storyPage.documentTitle', { title: story.title })}</title>
      {story.isOwner && !story.isPublic && (
        <Notice tone="info">{t('storyPage.notPublicYet')}</Notice>
      )}
      {/* Two columns only from 1024 px: at 768 px the side cards would be squeezed to about
          220 px and their label rows (140 px labels) would push the page sideways (rule 21). */}
      <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
        <div className="relative flex min-w-0 flex-[999_1_620px] flex-col gap-12">
          {/* A moderator confirmed this story copies a published work (S1-E10-08). */}
          <CopiedWorkNote storyId={story.id} />
          <StoryHeader story={story} />
          <StoryChapterList
            chapters={story.chapters}
            isOwner={story.isOwner}
            storySlug={story.slug}
          />
          {/* The parts of the plan the writer shares (S1-E17-33). */}
          <StoryWorldLinks storySlug={story.slug} />
          <StoryAdSlot story={story} />
        </div>
        <div className="relative w-full flex-[1_1_300px] lg:max-w-[340px]">
          <StorySideColumn story={story} />
        </div>
      </div>
    </PageContainer>
  );
}
