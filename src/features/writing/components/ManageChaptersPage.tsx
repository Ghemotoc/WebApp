/**
 * ManageChaptersPage: one story's chapters, to reorder, rename, unpublish, publish again,
 * delete and undo (story S1-E3-04; board 4.4, Chapters).
 *
 * Who shows it: the router, at /write/s/:storySlug/chapters; "Manage chapters" on Your writing
 * and the story link in the editor's breadcrumb lead here.
 * What it shows: the header (back to the writer dashboard, the story's title as the eyebrow,
 * "Manage chapters", the intro, "See story page" and "+ New chapter", the books-and-plant
 * doodle), the chapter list card, Recently deleted, and the delete dialog on top when asked.
 * The board's third card, "The whole story" (status, comments, delete the story), stays on the
 * story's settings page, where S1-E3-05 built it (docs/board-fixes.md).
 * What it calls: useMyStories (the story's title), useManageChapters (the list and every
 * change). After a delete or an undo, focus goes to the list's heading, because the row the
 * writer was on has moved.
 */
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';

import { ChevronLeftIcon } from '@/components/icons/ChevronLeftIcon';
import { Doodle } from '@/components/ui/Doodle';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import type { ManagedChapter } from '../api/manageChapters';
import { useManageChapters, type ChapterChange } from '../hooks/useManageChapters';
import { useMyStories } from '../hooks/useMyStories';

import { ChapterListCard } from './ChapterListCard';
import { DeleteChapterDialog } from './DeleteChapterDialog';
import { PlusIcon } from './ManageChaptersIcons';
import { NewChapterButton } from './NewChapterButton';
import { RecentlyDeletedChapters } from './RecentlyDeletedChapters';

/** The header: back link, the story's title, the heading, the intro and the two actions. */
function ManageChaptersHeader({ slug, storyTitle }: { slug: string; storyTitle: string }) {
  const { t } = useTranslation('writing');
  return (
    // mb-2 makes the board's 28 px gap above the card, so the card's doodle stays clear of the buttons.
    <header className="relative mb-2 flex flex-wrap items-end justify-between gap-6">
      <Doodle
        name="books-and-plant"
        kind="background"
        hideBelow="wide"
        className="absolute top-1.5 right-[360px] w-[150px] -rotate-4"
      />
      <div className="flex max-w-[760px] flex-col gap-3.5">
        <Link
          to="/write"
          className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-semibold no-underline hover:underline"
        >
          <ChevronLeftIcon />
          {t('newStory.back')}
        </Link>
        <div className="w-fit">
          <Eyebrow>{storyTitle}</Eyebrow>
        </div>
        <h1 className="m-0 text-[clamp(36px,4.4vw,64px)] leading-[0.98] font-extrabold tracking-[-0.025em]">
          {t('manageChapters.heading')}
        </h1>
        <p className="m-0 text-lg leading-relaxed text-body">{t('manageChapters.intro')}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to={`/s/${slug}`}
          className="inline-flex h-12 items-center rounded-full border border-control-border bg-surface px-[22px] text-[15px] font-semibold text-heading no-underline hover:bg-tint"
        >
          {t('storyCard.seePage')}
        </Link>
        <NewChapterButton
          slug={slug}
          size="lg"
          icon={<PlusIcon />}
          label={t('manageChapters.newChapter')}
        />
      </div>
    </header>
  );
}

/** The list, Recently deleted and the dialog, once the story is known. */
function ManageChaptersBody({ slug }: { slug: string }) {
  const { t } = useTranslation('writing');
  const chapters = useManageChapters(slug);
  const [toDelete, setToDelete] = useState<ManagedChapter | null>(null);
  const listHeadingRef = useRef<HTMLHeadingElement>(null);

  /** Delete and undo move the row away, so focus goes to the list's heading. */
  function changeAndRefocus(change: ChapterChange) {
    chapters.change(change);
    listHeadingRef.current?.focus();
  }

  if (!chapters.isKnown) return null;
  if (chapters.loadFailed) return <Notice tone="error">{t('errors.loadFailed')}</Notice>;
  return (
    <>
      <ChapterListCard
        slug={slug}
        chapters={chapters.live}
        problem={chapters.problem}
        isBusy={chapters.isBusy}
        headingRef={listHeadingRef}
        onChange={chapters.change}
        onAskDelete={setToDelete}
      />
      <RecentlyDeletedChapters
        chapters={chapters.deleted}
        isBusy={chapters.isBusy}
        onChange={changeAndRefocus}
      />
      <DeleteChapterDialog
        title={toDelete === null ? null : toDelete.title || t('manageChapters.untitled')}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete !== null) changeAndRefocus({ kind: 'delete', code: toDelete.code });
          setToDelete(null);
        }}
      />
    </>
  );
}

/**
 * Renders the page.
 *
 * @returns the screen, a wait, or a plain message
 */
export function ManageChaptersPage() {
  const { t } = useTranslation('writing');
  const { storySlug = '' } = useParams();
  const writing = useMyStories();
  const story = writing.stories.find((candidate) => candidate.slug === storySlug);

  return (
    <PageContainer className="tmc-rise flex flex-col gap-5 pt-10 pb-7">
      <title>{t('manageChapters.documentTitle')}</title>
      {writing.isKnown && !writing.isSignedIn && (
        <p className="m-0 text-body">{t('newStory.signedOut')}</p>
      )}
      {writing.isKnown && writing.isSignedIn && story === undefined && (
        <Notice tone="error">{t('settings.notFound')}</Notice>
      )}
      {story !== undefined && (
        <>
          <ManageChaptersHeader slug={story.slug} storyTitle={story.title} />
          <ManageChaptersBody slug={story.slug} />
        </>
      )}
    </PageContainer>
  );
}
