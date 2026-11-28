/**
 * StorySideColumn: "About this story" beside the story (story S1-E3-05; since bundle CALM-7c,
 * board New-Story and the handover's Step 3, "Side column").
 *
 * From 1024 px it sits to the right of the chapters; narrower, it moves under the labels. No
 * cards, in board B01's order (bundle 2, user story 2.1): "The writer" (StoryWriterCard),
 * "About this edition" for a story in several languages (TRANSLATE-1b), the box advert
 * (S1-E12-01; none on a class-only story, Q70) and "Report this story" after a flag.
 * A public-domain classic shows its real author, the source edition and the translator instead of
 * the writer (S1-E5-06, S1-E11-16).
 * Report button (CLAUDE.md rule 6): Lane C's shared <ReportButton> (S1-E10-01; architecture
 * 1.7.11), which opens the one report dialog for this story. Not shown to the story's owner, who
 * can't report their own story (the database refuses it too).
 * "Labels from the writer" moved to the main column (StoryLabels), where the board has it.
 * Who uses it: StoryPage.
 */
import { historicalYear } from '@/lib/historicalYear';
import { useTranslation } from 'react-i18next';

import { ReportButton } from '@/features/reporting/components/ReportButton';

import type { ClassicAuthor, StoryPageData } from '../api/storyPage';

import { StoryAdSlot } from './StoryAdSlot';
import { AboutEditionCard } from './StoryLanguageNote';
import { StoryWriterCard } from './StoryWriterCard';

/**
 * Where a classic's text comes from: the source edition as a link, and the translator (S1-E11-16
 * AC 5). Classics added before the staff form have no source, so the lines are left out.
 *
 * @returns the lines, or nothing
 */
function ClassicSource({ author }: { author: ClassicAuthor }) {
  const { t } = useTranslation('reading');
  return (
    <>
      {author.translatorName !== null && (
        <p className="m-0 type-body leading-normal text-ink-muted">
          {t('storyPage.classicTranslator', { name: author.translatorName })}
        </p>
      )}
      {author.sourceTitle !== null && author.sourceUrl !== null && (
        <p className="m-0 type-body leading-normal text-ink-muted">
          {t('storyPage.classicSource')}{' '}
          <a
            href={author.sourceUrl}
            rel="nofollow ugc noopener"
            target="_blank"
            className="font-semibold underline underline-offset-2"
          >
            {author.sourceTitle}
          </a>
        </p>
      )}
    </>
  );
}

/**
 * The card for a public-domain classic: the real author and the year they died, with no Follow
 * and no profile, because the author has no account (S1-E5-06, 25 Oct 2026), and since S1-E11-16
 * the source edition and the translator.
 *
 * @returns the card
 */
function ClassicAuthorCard({ author }: { author: ClassicAuthor }) {
  const { t } = useTranslation('reading');
  return (
    <section aria-labelledby="story-author-heading" className="flex flex-col gap-2">
      <p className="m-0 type-meta leading-[18px] text-ink-muted">{t('storyPage.authorEyebrow')}</p>
      <h2 id="story-author-heading" className="m-0 type-subheading text-ink-heading">
        {author.name}
      </h2>
      <p className="m-0 type-body leading-normal text-ink-muted">
        {t('storyPage.classicAuthorNote', { year: historicalYear(author.diedYear, t) })}
      </p>
      <ClassicSource author={author} />
    </section>
  );
}

/**
 * Renders the column.
 *
 * @returns the side column
 */
export function StorySideColumn({ story }: { story: StoryPageData }) {
  const { t } = useTranslation('reading');
  return (
    <aside aria-label={t('storyPage.sideColumnLabel')} className="flex flex-col gap-8">
      {story.writer.classicAuthor === null ? (
        <StoryWriterCard writer={story.writer} isOwner={story.isOwner} />
      ) : (
        <ClassicAuthorCard author={story.writer.classicAuthor} />
      )}
      {/* TRANSLATE-1b: only for a story in several languages. */}
      <AboutEditionCard story={story} />
      <StoryAdSlot story={story} />
      {/* Report shows only to readers: the owner can't report their own story. */}
      {!story.isOwner && (
        <div className="relative flex items-center">
          <ReportButton
            itemType="story"
            itemReference={story.id}
            itemLabel={story.title}
            look="flaggedText"
            visibleLabel={t('storyPage.reportThisStory')}
          />
        </div>
      )}
    </aside>
  );
}
