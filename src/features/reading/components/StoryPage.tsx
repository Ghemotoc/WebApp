/**
 * StoryPage: a story's public page, screen 3.4 (story S1-E3-05 starts it; since bundle CALM-7c,
 * board New-Story and the simplified design handover, Step 3, "Story page"; page template: shelf
 * page).
 *
 * Who shows it: the router, at /s/:storySlug; shared links, story cards and Your writing's "See
 * story page" lead here.
 * What it shows, top to bottom: the breadcrumb "Read / category / title" (StoryBreadcrumb); the
 * page's one glass hero (StoryHeader: cover, meta lines, title, blurb, tags and the buttons); then
 * two columns from 1024 px. The main column holds the chapters (StoryChapterList), "Shared by
 * the writer" (StoryWorldLinks, S1-E17-33) and "Labels from the writer" (StoryLabels). The side
 * column, "About this story" (StorySideColumn), holds the writer, the advert (S1-E12-01; none on a
 * class-only story, Q70) and Report. Below both: "More by" and "Stories like this"
 * (StorySuggestions, S1-E15-06). The owner sees a note while nothing is published yet.
 * A signed-out visitor on a 16+ or 18+ story gets its title and NoPreviewNotice instead of "not
 * available" (S1-E4-04; they count as under 16, Q6).
 * A story hidden in the reader's country gets board B11's "This page isn't available here"
 * (UnavailableHereNotice; useUnavailableHere → story_unavailable_here(); COUNTRY-1).
 * A story in several languages (TRANSLATE-1b): useOpeningEdition moves the reader to the language
 * the story should open in (their own earlier choice, the page's language, a language they read,
 * then the original), and the header, chapter list and side column show the language parts.
 * What it calls: useStoryPage → get_story_page() (ADR 0004: never the tables); useStoryPreview →
 * get_link_preview() only when that answered nothing; useOpeningEdition → story_opening_edition().
 */
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { UnavailableHereNotice } from '@/features/country-block/components/UnavailableHereNotice';
import { useUnavailableHere } from '@/features/country-block/hooks/useUnavailableHere';
import { StorySuggestions } from '@/features/suggestions/components/StorySuggestions';

import type { StoryPageData } from '../api/storyPage';
import { useOpeningEdition } from '../hooks/useOpeningEdition';
import { useStoryPage } from '../hooks/useStoryPage';
import { useStoryPreview } from '../hooks/useStoryPreview';

import { NoPreviewNotice } from './NoPreviewNotice';
import { StoryBreadcrumb } from './StoryBreadcrumb';
import { StoryChapterList, type ChapterListEdition } from './StoryChapterList';
import { CopiedWorkNote } from './CopiedWorkNote';
import { StoryHeader } from './StoryHeader';
import { StoryLabels } from './StoryLabels';
import { StorySideColumn } from './StorySideColumn';
import { StoryWorldLinks } from './StoryWorldLinks';
import { useStoryStatement } from '../hooks/useStoryStatement';

/** "This story isn't available", with the way home. */
function StoryUnavailable() {
  const { t } = useTranslation('reading');
  return (
    <div className="flex flex-col items-start gap-3 rounded-card border border-border bg-surface px-8 py-8">
      <h1 className="m-0 font-heading type-heading font-bold text-ink-heading">
        {t('storyPage.unavailableTitle')}
      </h1>
      <p className="m-0 type-body text-ink-muted">{t('storyPage.unavailableBody')}</p>
      <Link
        to="/"
        className="inline-flex h-11 items-center rounded-full button-main px-4 type-body font-semibold no-underline"
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
  // COUNTRY-1: a story hidden in the reader's country gets board B11's page instead.
  const country = useUnavailableHere(storySlug, true);
  if (!isSettled || !country.isSettled) return null;
  if (country.isHere) return <UnavailableHereNotice />;
  if (hidden !== null) return <NoPreviewNotice preview={hidden} />;
  return (
    <>
      <title>{t('storyPage.unavailableTitle')}</title>
      <StoryUnavailable />
    </>
  );
}

/**
 * What the chapter list needs to know about a story in several languages (TRANSLATE-1b).
 *
 * @param story - the story the page shows
 * @returns the edition on screen, or null for a story in one language
 */
function chapterListEdition(story: StoryPageData): ChapterListEdition | null {
  if (story.editions.length < 2 || story.edition === null) return null;
  return { languageCode: story.languageCode, facts: story.edition };
}

/**
 * The chapter list, after the "In the app only" notice when that applies.
 *
 * @returns the notice and the list
 */
function StoryChapters({ story }: { story: StoryPageData }) {
  const { t } = useTranslation('reading');
  return (
    <>
      {/* GAPS-15 (S1-E3-08): the chapters open in the app; the list stays to browse. */}
      {story.appOnly && (
        <Notice tone="info">{t('storyPage.appOnly', { writer: story.writer.displayName })}</Notice>
      )}
      <StoryChapterList
        chapters={story.chapters}
        isOwner={story.isOwner}
        storySlug={story.slug}
        edition={chapterListEdition(story)}
        nextChapter={story.nextChapter}
      />
    </>
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
  // TRANSLATE-1b: a story in several languages opens in this reader's language.
  useOpeningEdition(story);
  // CALM-9s: the footer says what this story is, for readers and search engines, once the
  // reader may see the story at all.
  useStoryStatement(storySlug, isLoaded && story !== null);

  if (loadFailed) {
    return (
      <PageContainer className="pt-12 pb-6">
        <Notice tone="error">{t('storyPage.loadFailed')}</Notice>
      </PageContainer>
    );
  }
  if (!isLoaded) return null;
  if (story === null) {
    return (
      <PageContainer className="tmc-rise pt-12 pb-6">
        <StoryMissing storySlug={storySlug} />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="tmc-rise flex flex-col gap-8 pt-8 pb-16">
      <title>{t('storyPage.documentTitle', { title: story.title })}</title>
      {story.isOwner && !story.isPublic && (
        <Notice tone="info">{t('storyPage.notPublicYet')}</Notice>
      )}
      {/* Discover / category / title (G7): the way back, and to the category page. */}
      <StoryBreadcrumb title={story.title} categorySlug={story.categorySlug} />
      {/* A moderator confirmed this story copies a published work (S1-E10-08). */}
      <CopiedWorkNote storyId={story.id} />
      {/* The page's one glass hero (board New-Story). */}
      <StoryHeader story={story} />
      {/* Two columns only from 1024 px: at 768 px a 320 px side column would squeeze the label
          rows (140 px labels) and push the page sideways (rule 21). */}
      <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-16">
        <div className="flex min-w-0 flex-col gap-12">
          <StoryChapters story={story} />
          {/* The parts of the plan the writer shares (S1-E17-33). */}
          <StoryWorldLinks storySlug={story.slug} />
          <StoryLabels story={story} />
        </div>
        <StorySideColumn story={story} />
      </div>
      {/* "More by" and "Stories like this" (S1-E15-06), across the page's width. */}
      <StorySuggestions storySlug={story.slug} />
    </PageContainer>
  );
}
