/**
 * ChapterCommentsPage: /write/comments, every comment readers wrote under the writer's chapters
 * (bundle GAPS-5; story S1-E3-07; board Write, "See all comments").
 *
 * What it shows: a link back to Write, the heading, a "Story" drop-down once the writer has more
 * than one published story, the comments newest first as the same cards the Write page shows
 * (each naming its story and chapter, with "Reply" to the comments under that chapter), and
 * "Show older" while more are left. These are the public comments the writer can already read
 * under each chapter (deleted, blocked and moderated ones left out); never a list of readers.
 * Who shows it: the router; "See all comments" on the Write page leads here.
 * What it calls: useMyChapterComments (my_chapter_comments()) and WriterCommentCard.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { Select } from '@/components/ui/Select';
import { useSession } from '@/features/auth/hooks/useSession';

import type { CommentedStory } from '../api/chapterComments';
import { useMyChapterComments } from '../hooks/useMyChapterComments';

import { WriterCommentCard } from './WriterCommentCard';

/** The drop-down's value for "every story". */
const everyStory = '';

/** The link back, the eyebrow, the heading and one line on what the list holds. */
function CommentsHeader() {
  const { t } = useTranslation('writing');
  return (
    <header className="flex flex-col gap-4">
      <Link
        to="/write"
        className="inline-flex h-9 items-center gap-1.5 self-start rounded-full border border-control-border bg-surface px-4 text-[13px] font-semibold text-heading no-underline hover:bg-tint"
      >
        <span aria-hidden="true">←</span>
        {t('allComments.back')}
      </Link>
      <div className="flex max-w-[640px] flex-col gap-2">
        <Eyebrow>{t('allComments.eyebrow')}</Eyebrow>
        <h1 className="page-title">{t('allComments.heading')}</h1>
        <p className="m-0 text-lg leading-relaxed text-body">{t('allComments.lead')}</p>
      </div>
    </header>
  );
}

/** "Story": every story or one of them. Only shown when there is a choice to make. */
function StoryFilter({
  stories,
  chosen,
  onChoose,
}: {
  stories: CommentedStory[];
  chosen: string;
  onChoose: (slug: string) => void;
}) {
  const { t } = useTranslation('writing');
  if (stories.length < 2) return null;
  return (
    <Select
      id="all-comments-story"
      label={t('allComments.storyLabel')}
      isLabelVisible
      value={chosen}
      onChange={onChoose}
      options={[
        { value: everyStory, label: t('allComments.everyStory') },
        ...stories.map((story) => ({ value: story.slug, label: story.title })),
      ]}
    />
  );
}

/** The filter, the list and "Show older", once the writer is known to be signed in. */
function CommentsBody() {
  const { t } = useTranslation('writing');
  const [chosenStory, setChosenStory] = useState(everyStory);
  const list = useMyChapterComments(chosenStory === everyStory ? null : chosenStory);
  if (list.loadFailed) return <Notice tone="error">{t('allComments.loadFailed')}</Notice>;
  return (
    <div className="flex flex-col gap-6">
      <StoryFilter stories={list.stories} chosen={chosenStory} onChoose={setChosenStory} />
      {/* Step 1: a plain line when nobody has commented yet (or not on this story). */}
      {list.isLoaded && list.comments.length === 0 && (
        <p className="m-0 text-body">{t('dashboard.comments.empty')}</p>
      )}
      {/* Step 2: the comments, newest first, one column so long comments stay easy to read. */}
      {list.comments.length > 0 && (
        <ul
          aria-label={t('allComments.listLabel')}
          className="m-0 flex max-w-[760px] list-none flex-col gap-4 p-0"
        >
          {list.comments.map((comment) => (
            <WriterCommentCard
              key={`${comment.chapterCode}-${comment.createdAt}-${comment.handle}`}
              comment={comment}
              storyTitle={comment.storyTitle}
              isShortened={comment.isShortened}
            />
          ))}
        </ul>
      )}
      {/* Step 3: the next page. */}
      {list.hasMore && (
        <Button
          variant="secondary"
          className="self-start"
          onClick={list.loadMore}
          disabled={list.isLoadingMore}
        >
          {t('allComments.showOlder')}
        </Button>
      )}
    </div>
  );
}

/**
 * Renders the page.
 *
 * @returns the comments page, or a plain line for someone who isn't signed in
 */
export function ChapterCommentsPage() {
  const { t } = useTranslation('writing');
  const { userId, isKnown } = useSession();
  if (!isKnown) return null;
  return (
    <PageContainer className="tmc-rise flex flex-col gap-8 pt-10 pb-16">
      <title>{t('allComments.documentTitle')}</title>
      <CommentsHeader />
      {userId === null ? (
        <p className="m-0 text-body">{t('yourWriting.signedOut')}</p>
      ) : (
        <CommentsBody />
      )}
    </PageContainer>
  );
}
