/**
 * StaffStoryChapters: one story's chapters in the admin site (bundle ADMIN-2, part a; story
 * S1-E11-07; board AdminStory 8.11's chapter list): number, title, status, words and when it was
 * published. A draft chapter shows no title, because unpublished words are the writer's; its text
 * opens only from a case or a data request (later parts), never from here.
 *
 * Who shows it: StaffStoryPage. What it reads: the chapters from useStaffStory.
 */
import { useTranslation } from 'react-i18next';

import { InfoPill } from '@/components/ui/InfoPill';

import type { StaffStoryChapter } from '../../api/staffStories';
import { useStaffStoryWords } from '../../hooks/useStaffStoryWords';

/**
 * One chapter's line.
 *
 * @returns the list item
 */
function ChapterLine({ chapter }: { chapter: StaffStoryChapter }) {
  const { t } = useTranslation('staff');
  const words = useStaffStoryWords();
  const title = chapter.title ?? t('stories.page.untitledDraft');
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border py-2.5">
      <span className="font-semibold text-heading">
        {t('stories.page.chapterTitle', { number: chapter.number, title })}
      </span>
      <InfoPill tone={chapter.status === 'published' ? 'sage' : 'gold'}>
        {t(`stories.page.chapterStatuses.${chapter.status}`, { defaultValue: chapter.status })}
      </InfoPill>
      {chapter.isHidden && <InfoPill tone="blush">{t('stories.statuses.hidden')}</InfoPill>}
      <span className="text-sm text-meta">
        {t('stories.page.words', { count: chapter.words })}
        {chapter.publishedAt !== null && <> · {words.date(chapter.publishedAt)}</>}
      </span>
    </li>
  );
}

/**
 * Renders the chapter list.
 *
 * @param props.chapters - the story's chapters, in order
 * @returns the section
 */
export function StaffStoryChapters({ chapters }: { chapters: StaffStoryChapter[] }) {
  const { t } = useTranslation('staff');
  return (
    <section aria-labelledby="story-chapters-heading" className="flex flex-col gap-2">
      <h2
        id="story-chapters-heading"
        className="m-0 font-heading text-[24px] font-bold text-heading"
      >
        {t('stories.page.chaptersHeading')}
      </h2>
      {chapters.length === 0 ? (
        <p className="m-0 text-body">{t('stories.page.noChapters')}</p>
      ) : (
        <ol className="m-0 list-none p-0">
          {chapters.map((chapter) => (
            <ChapterLine key={chapter.id} chapter={chapter} />
          ))}
        </ol>
      )}
      <p className="m-0 text-sm text-meta">{t('stories.page.noWordsNote')}</p>
    </section>
  );
}
