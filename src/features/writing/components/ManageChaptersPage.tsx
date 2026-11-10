/**
 * ManageChaptersPage: one story's chapters, to reorder, rename, unpublish, publish again,
 * delete and undo (story S1-E3-04; board 4.4, Chapters).
 *
 * Who shows it: the router, at /write/s/:storySlug/chapters; "Manage chapters" on Your writing
 * and the story link in the editor's breadcrumb lead here.
 * What it shows: the header (back to the writer dashboard, the story's title as the eyebrow,
 * "Manage chapters", the intro, "Story settings", "Open the chapter board" and "+ New
 * chapter"), the "This story in numbers" row, the chapter list card, Recently deleted, and the
 * delete or move dialog on top when asked (liquid glass Chapters board, G9d).
 * Chapter numbers follow the reading order, so a move that gives a published chapter a new
 * number asks first (MoveChapterDialog); drafts and scheduled chapters move straight away.
 * The board's third card, "The whole story" (status, comments, delete the story), stays on the
 * story's settings page, where S1-E3-05 built it (docs/board-fixes.md).
 * What it calls: useMyStories (the story's title), useManageChapters (the list and every
 * change), lib/chapterMoves.ts (which moves ask first). After a delete or an undo, focus goes to the list's heading, because the row the
 * writer was on has moved.
 */
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';

import { ChevronLeftIcon } from '@/components/icons/ChevronLeftIcon';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import type { ManagedChapter } from '../api/manageChapters';
import { useManageChapters, type ChapterChange } from '../hooks/useManageChapters';
import { useMyStories } from '../hooks/useMyStories';
import { chapterMoveOf, needsMoveQuestion } from '../lib/chapterMoves';

import { ChapterListCard } from './ChapterListCard';
import { ChapterStats } from './ChapterStats';
import { DeleteChapterDialog } from './DeleteChapterDialog';
import { PlusIcon } from './ManageChaptersIcons';
import { MoveChapterDialog } from './MoveChapterDialog';
import { NewChapterButton } from './NewChapterButton';
import { RecentlyDeletedChapters } from './RecentlyDeletedChapters';

/** A move waiting for the writer's answer, with what the question says. */
interface PendingMove {
  change: ChapterChange;
  title: string;
  newNumber: number;
}

/** The glass look of the header's two links (the same as on Story settings). */
const headerLinkClass =
  'inline-flex h-12 items-center rounded-full button-glass px-[22px] text-[15px] font-semibold no-underline';

/** The header: back link, the story's title, the heading, the intro and the two actions. */
function ManageChaptersHeader({ slug, storyTitle }: { slug: string; storyTitle: string }) {
  const { t } = useTranslation('writing');
  return (
    // mb-2 makes the board's 28 px gap above the card.
    <header className="relative mb-2 flex flex-wrap items-end justify-between gap-6">
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
        <Link to={`/write/s/${slug}/settings`} className={headerLinkClass}>
          {t('storyCard.settings')}
        </Link>
        <Link to={`/plan/s/${slug}`} className={headerLinkClass}>
          {t('manageChapters.chapterBoard')}
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
  // A move of a published chapter waits here until the writer answers the question.
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const listHeadingRef = useRef<HTMLHeadingElement>(null);

  /** Moves that renumber a published chapter ask first; every other change goes straight on. */
  function askOrChange(change: ChapterChange) {
    const move = chapterMoveOf(change, chapters.live);
    if (needsMoveQuestion(move)) {
      setPendingMove({
        change,
        title: move.chapter.title || t('manageChapters.untitled'),
        newNumber: move.newNumber,
      });
      return;
    }
    chapters.change(change);
  }

  /** Delete and undo move the row away, so focus goes to the list's heading. */
  function changeAndRefocus(change: ChapterChange) {
    chapters.change(change);
    listHeadingRef.current?.focus();
  }

  if (!chapters.isKnown) return null;
  if (chapters.loadFailed) return <Notice tone="error">{t('errors.loadFailed')}</Notice>;
  return (
    <>
      <ChapterStats chapters={chapters.live} />
      <ChapterListCard
        slug={slug}
        chapters={chapters.live}
        problem={chapters.problem}
        isBusy={chapters.isBusy}
        headingRef={listHeadingRef}
        onChange={askOrChange}
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
      <MoveChapterDialog
        move={pendingMove}
        onClose={() => setPendingMove(null)}
        onConfirm={() => {
          if (pendingMove !== null) chapters.change(pendingMove.change);
          setPendingMove(null);
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
