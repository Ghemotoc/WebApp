/**
 * ManageChaptersPage: one story's chapters, to open, reorder, rename, preview, schedule,
 * unpublish, publish again, copy the link of, delete and undo (story S1-E3-04; board D03,
 * user story 5.3, "Chapters of a story").
 *
 * Who shows it: the router, at /write/s/:storySlug/chapters; "Manage chapters" on Write and the
 * story link in the editor's breadcrumb lead here.
 * What it shows (board D03): the breadcrumb (Writing / the story), "Chapters" with the story's
 * title under it, New chapter (the one main button: an empty chapter after the last one), Story
 * settings and Open the chapter board; the four numbers (ChapterStats); the chapter list
 * (ChapterList); Recently deleted; and the delete or move question on top when asked.
 * Chapter numbers follow the reading order, so a move that gives a published chapter a new
 * number asks first ("Change the order readers see?", MoveChapterDialog); drafts and scheduled
 * chapters move straight away. Taking the last-chapter mark off when a chapter moves, is
 * unpublished or deleted is the database's job (CALM-6, check_last_chapter_mark()).
 * What it calls: useMyStories (the story's title and status), useManageChapters (the list and
 * every change), useWriterDashboard (all-time reads and each chapter's likes) and
 * lib/chapterMoves.ts (which moves ask first). After a delete or an undo, focus goes to the
 * list's heading, because the row the writer was on has moved.
 */
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { buttonClassName } from '@/components/ui/buttonStyles';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { atlasEntryAddress } from '@/features/atlas/lib/atlasSections';

import type { ManagedChapter } from '../api/manageChapters';
import type { MyStory } from '../api/stories';
import { useManageChapters, type ChapterChange } from '../hooks/useManageChapters';
import { useMyStories } from '../hooks/useMyStories';
import { useWriterDashboard } from '../hooks/useWriterDashboard';
import { chapterMoveOf, needsMoveQuestion } from '../lib/chapterMoves';
import { storyReads } from '../lib/chapterStats';

import { ChapterList } from './ChapterList';
import { ChapterStats } from './ChapterStats';
import { DeleteChapterDialog } from './DeleteChapterDialog';
import { MoveChapterDialog } from './MoveChapterDialog';
import { NewChapterButton } from './NewChapterButton';
import { RecentlyDeletedChapters } from './RecentlyDeletedChapters';
import { WritingBreadcrumb } from './WritingBreadcrumb';

/** A move waiting for the writer's answer, with what the question says. */
interface PendingMove {
  change: ChapterChange;
  title: string;
  newNumber: number;
}

/** The header: breadcrumb, "Chapters", the story's title and the three actions. */
function ManageChaptersHeader({ slug, storyTitle }: { slug: string; storyTitle: string }) {
  const { t } = useTranslation('writing');
  return (
    <header className="flex flex-col gap-4">
      <WritingBreadcrumb
        crumbs={[{ label: t('breadcrumb.writing'), to: '/write' }, { label: storyTitle }]}
      />
      <div className="flex flex-col gap-2">
        <h1 className="m-0 type-title lg:type-display">{t('manageChapters.heading')}</h1>
        <p className="m-0 type-body text-ink-muted">{storyTitle}</p>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <NewChapterButton
          slug={slug}
          size="lg"
          icon={<ActionIcon name="plus" size={20} />}
          label={t('manageChapters.newChapter')}
        />
        <Link
          to={`/write/s/${slug}/settings`}
          className={buttonClassName({ variant: 'secondary', size: 'lg' })}
        >
          {t('storyCard.settings')}
        </Link>
        <Link
          to={atlasEntryAddress(slug)}
          className={buttonClassName({ variant: 'secondary', size: 'lg' })}
        >
          {t('manageChapters.chapterBoard')}
        </Link>
      </div>
    </header>
  );
}

/**
 * The questions the page asks before a change, and where focus goes after one: a move that
 * renumbers a published chapter waits for its answer; a delete or an undo sends focus to the
 * list's heading.
 *
 * @param chapters - the list and its change function, from useManageChapters
 * @returns the delete and move questions, the change functions and the heading's ref
 */
function useChapterQuestions(chapters: ReturnType<typeof useManageChapters>) {
  const { t } = useTranslation('writing');
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

  return {
    toDelete,
    setToDelete,
    pendingMove,
    setPendingMove,
    listHeadingRef,
    askOrChange,
    changeAndRefocus,
  };
}

/** The numbers, the list, Recently deleted and the questions, once the story is known. */
function ManageChaptersBody({ story }: { story: MyStory }) {
  const { t } = useTranslation('writing');
  const slug = story.slug;
  const chapters = useManageChapters(slug);
  // All-time numbers from the writer dashboard: the story's reads and each chapter's likes.
  const { dashboard } = useWriterDashboard('all');
  const dashboardChapters = dashboard?.chapters ?? [];
  const { toDelete, setToDelete, pendingMove, setPendingMove, ...questions } =
    useChapterQuestions(chapters);

  if (!chapters.isKnown) return null;
  if (chapters.loadFailed) return <Notice tone="error">{t('errors.loadFailed')}</Notice>;
  return (
    <>
      <ChapterStats
        chapters={chapters.live}
        reads={storyReads(dashboardChapters, slug)}
        completionStatus={story.completionStatus}
      />
      <ChapterList
        slug={slug}
        chapters={chapters.live}
        dashboardChapters={dashboardChapters}
        problem={chapters.problem}
        isBusy={chapters.isBusy}
        headingRef={questions.listHeadingRef}
        onChange={questions.askOrChange}
        onAskDelete={setToDelete}
      />
      <RecentlyDeletedChapters
        chapters={chapters.deleted}
        isBusy={chapters.isBusy}
        onChange={questions.changeAndRefocus}
      />
      <DeleteChapterDialog
        title={toDelete === null ? null : toDelete.title || t('manageChapters.untitled')}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete !== null)
            questions.changeAndRefocus({ kind: 'delete', code: toDelete.code });
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
    <PageContainer className="tmc-rise flex flex-col gap-8 pt-8 pb-12">
      <title>{t('manageChapters.documentTitle')}</title>
      {writing.isKnown && !writing.isSignedIn && (
        <p className="m-0 text-ink-muted">{t('newStory.signedOut')}</p>
      )}
      {writing.isKnown && writing.isSignedIn && story === undefined && (
        <Notice tone="error">{t('settings.notFound')}</Notice>
      )}
      {story !== undefined && (
        <>
          <ManageChaptersHeader slug={story.slug} storyTitle={story.title} />
          <ManageChaptersBody story={story} />
        </>
      )}
    </PageContainer>
  );
}
