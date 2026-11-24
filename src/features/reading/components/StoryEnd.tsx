/**
 * StoryEnd: what comes under the paper after the latest chapter (board B06-ReaderLast; BOOKS
 * B06, user story 2.6; the rows from story S1-E15-06).
 *
 * At the end of a story (the chapter the writer marked as the last, CALM-6) a "What next" section
 * opens with a green note: "The Salt Mine Choir is complete. It moves to Finished in the
 * Library, and readers who follow it get one last notification." Under the words, "Follow"
 * for the writer (story 2.6: the honest way to hear about the next story, for under-18s too;
 * FollowButton says why a read-only account can't, and shows nothing on the writer's own story).
 * Then the "More by" and "Stories like this" rows. After the latest chapter of a story still
 * going, only the rows show, as before.
 * Its own file, loaded only after the latest chapter, so the follow button and the note stay out
 * of the reader's first download (e2e/reader-performance.spec.ts, S1-E4-01b).
 * Who uses it: ChapterReading, under the chapter navigation. What it calls: FollowButton and
 * StorySuggestionsWhenNear.
 */
import { useTranslation } from 'react-i18next';

import { ButtonRow } from '@/components/ui/ButtonRow';
import { FollowButton } from '@/features/people/components/FollowButton';
import { StorySuggestionsWhenNear } from '@/features/suggestions/components/StorySuggestionsWhenNear';

import type { ReaderChapter } from '../api/chapter';
import { isStoryEnd } from '../lib/chapterPlace';

/**
 * The green note and the writer's Follow button.
 *
 * @returns the note
 */
function StoryCompleteNote({ chapter }: { chapter: ReaderChapter }) {
  const { t } = useTranslation('reading');
  const writer = chapter.story.writer;
  return (
    <div className="flex flex-col gap-3 rounded-field border border-(--success-border) bg-(--success-bg) p-4 text-(--success-text)">
      <p className="m-0 max-w-none type-body">
        {t('reader.storyComplete', { story: chapter.story.title })}
      </p>
      <ButtonRow>
        <FollowButton
          target={{ kind: 'writer', handle: writer.handle }}
          targetLabel={writer.displayName}
        />
      </ButtonRow>
    </div>
  );
}

/**
 * Renders what follows the latest chapter.
 *
 * @param props.chapter - the chapter just read, the latest one published
 * @returns "What next" with the note and the rows at the end of a story, else the rows alone
 */
export function StoryEnd({ chapter }: { chapter: ReaderChapter }) {
  const { t } = useTranslation('reading');
  const rows = <StorySuggestionsWhenNear storySlug={chapter.story.slug} />;
  if (!isStoryEnd(chapter)) return <div className="mt-12">{rows}</div>;
  return (
    <section aria-labelledby="what-next-heading" className="mt-12 flex flex-col gap-6">
      <h2
        id="what-next-heading"
        className="m-0 font-heading type-heading font-bold tracking-[-0.01em] text-ink-heading"
      >
        {t('reader.whatNext')}
      </h2>
      <StoryCompleteNote chapter={chapter} />
      {rows}
    </section>
  );
}
