/**
 * ChapterMissing: what the reader shows when a chapter can't be shown (story S1-E4-01a; Q6;
 * COUNTRY-1). Split out of ChapterReaderPage and loaded only when needed, so a reader who opens a
 * chapter normally never downloads it (the 1,300 KB script budget, S1-E4-01b).
 *
 * Who shows it: ChapterReaderPage, when get_chapter() answered nothing.
 * What it shows: NoPreviewNotice for a signed-out visitor on a 16+ or 18+ story
 * (useStoryPreview → get_link_preview()); UnavailableHereNotice (board B11) when the story is
 * hidden in the reader's country (useUnavailableHere → story_unavailable_here()); otherwise
 * "This chapter isn't available", with the way home.
 */
import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { UnavailableHereNotice } from '@/features/country-block/components/UnavailableHereNotice';
import { useUnavailableHere } from '@/features/country-block/hooks/useUnavailableHere';

import { useStoryPreview } from '../hooks/useStoryPreview';

/**
 * "No preview for this story", loaded only for a signed-out visitor on a 16+ or 18+ chapter, so it
 * stays out of every other reader's cold load (the 1,300 KB script budget, S1-E4-01b).
 */
const NoPreviewNotice = lazy(async () => {
  const module = await import('./NoPreviewNotice');
  return { default: module.NoPreviewNotice };
});

/** "This chapter isn't available", with the way home. */
function ChapterUnavailable() {
  const { t } = useTranslation('reading');
  return (
    <div className="flex flex-col items-start gap-3 rounded-card border border-border bg-surface px-8 py-8">
      <h1 className="m-0 font-heading type-heading font-bold text-ink-heading">
        {t('reader.unavailableTitle')}
      </h1>
      <p className="m-0 type-body text-ink-muted">{t('reader.unavailableBody')}</p>
      <Link
        to="/"
        className="inline-flex h-11 items-center rounded-full button-main px-4 type-body font-semibold no-underline"
      >
        {t('storyPage.goHome')}
      </Link>
    </div>
  );
}

/**
 * When the chapter can't be shown: for a signed-out visitor on a 16+ or 18+ story, why (Q6); for a
 * story hidden in the reader's country, board B11's page (COUNTRY-1); otherwise "not available".
 *
 * @param props.storySlug - the story's address
 * @param props.chapterCode - the chapter's code
 * @returns the right notice, or nothing while the checks are still answering
 */
export function ChapterMissing({
  storySlug,
  chapterCode,
}: {
  storySlug: string;
  chapterCode: string;
}) {
  const { t } = useTranslation('reading');
  const { hidden, isSettled } = useStoryPreview(storySlug, chapterCode, true);
  // COUNTRY-1: a story hidden in the reader's country gets board B11's page instead.
  const country = useUnavailableHere(storySlug, true);
  if (!isSettled || !country.isSettled) return null;
  if (country.isHere) {
    return <UnavailableHereNotice />;
  }
  if (hidden !== null) {
    return (
      <Suspense fallback={null}>
        <NoPreviewNotice preview={hidden} />
      </Suspense>
    );
  }
  return (
    <>
      <title>{t('reader.unavailableTitle')}</title>
      <ChapterUnavailable />
    </>
  );
}
