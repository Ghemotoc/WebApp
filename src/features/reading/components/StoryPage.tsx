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
 * numbers and "See profile" (S1-E5-05), the breadcrumb (S1-E5-01), the ad slot (S1-E12-01),
 * "Web and app" (S1-E3-08). Doodles: the music notes by the header and the mug and mushroom by
 * the side column, as on the board; the chapter card's book and puppy come with the list.
 * What it calls: useStoryPage → get_story_page() (ADR 0004: never the tables).
 */
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';

import { Doodle } from '@/components/ui/Doodle';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import { useStoryPage } from '../hooks/useStoryPage';

import { StoryChapterList } from './StoryChapterList';
import { StoryHeader } from './StoryHeader';
import { StorySideColumn } from './StorySideColumn';

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
        className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-on-primary no-underline hover:opacity-90"
      >
        {t('storyPage.goHome')}
      </Link>
    </div>
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
        <title>{t('storyPage.unavailableTitle')}</title>
        <StoryUnavailable />
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
          <StoryHeader story={story} />
          <StoryChapterList chapters={story.chapters} isOwner={story.isOwner} />
          {/* Beside the cover, in the space to its right: below the cover the pills and the
              title move with the story's state, so a doodle there would end up over them. */}
          <Doodle
            name="music-notes"
            kind="background"
            hideBelow="wide"
            className="absolute top-6 left-[300px] w-28 -rotate-6"
          />
        </div>
        <div className="relative w-full flex-[1_1_300px] lg:max-w-[340px]">
          <StorySideColumn story={story} />
        </div>
      </div>
    </PageContainer>
  );
}
