/**
 * StorySideColumn: "About this story" beside the story (story S1-E3-05; since bundle CALM-7c,
 * board New-Story and the handover's Step 3, "Side column").
 *
 * From 1024 px it sits to the right of the chapters; narrower, it moves under the labels. No
 * cards: the writer (the line "The writer", the name as a link to the profile, the handle, the
 * rank pill, IDEAS-3a, the bio, Follow, S1-E6-05, and "See profile", S1-E5-05, then the line on
 * who can see followers), "About this edition" for a story in several languages (TRANSLATE-1b),
 * the box advert (S1-E12-01; none on a class-only story, Q70) and "Report this story".
 * The board's follower and read numbers wait for get_story_page() to send them (a follow-up).
 * A public-domain classic shows its real author, the source edition and the translator instead of
 * the writer (S1-E5-06, S1-E11-16).
 * Report button (CLAUDE.md rule 6): Lane C's shared <ReportButton> (S1-E10-01; architecture
 * 1.7.11), which opens the one report dialog for this story. Not shown to the story's owner, who
 * can't report their own story (the database refuses it too).
 * "Labels from the writer" moved to the main column (StoryLabels), where the board has it.
 * Who uses it: StoryPage.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { MetaLine } from '@/components/ui/MetaLine';
import { FollowButton } from '@/features/people/components/FollowButton';
import { ReportButton } from '@/features/reporting/components/ReportButton';

import type { ClassicAuthor, StoryPageData } from '../api/storyPage';
import { ProfileRankChip } from '@/features/forums/components/ProfileRankChip';

import { StoryAdSlot } from './StoryAdSlot';
import { AboutEditionCard } from './StoryLanguageNote';

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
        {t('storyPage.classicAuthorNote', { year: author.diedYear })}
      </p>
      <ClassicSource author={author} />
    </section>
  );
}

/**
 * The writer card: pen name or username, the handle, the bio and "See profile" (S1-E5-05) and
 * Follow (S1-E6-05; not on one's own story).
 *
 * @returns the card
 */
function WriterCard({ writer, isOwner }: { writer: StoryPageData['writer']; isOwner: boolean }) {
  const { t } = useTranslation('reading');
  const profileHref = `/u/${encodeURIComponent(writer.handle)}`;
  return (
    <section aria-labelledby="story-writer-heading" className="flex flex-col gap-2">
      <p className="m-0 type-meta leading-[18px] text-ink-muted">{t('storyPage.writerEyebrow')}</p>
      {/* The name links to the profile; the handle sits under it as a meta line. */}
      <div className="flex flex-col">
        <Link
          id="story-writer-heading"
          to={profileHref}
          className="type-subheading text-ink-heading no-underline hover:underline"
        >
          {writer.displayName}
        </Link>
        <MetaLine facts={[{ text: `@${writer.handle}` }]} />
      </div>
      {/* IDEAS-3a: the writer's rank pill, as on their profile (profile_rank()); it stays a pill, only as wide as its words. */}
      <div className="w-fit">
        <ProfileRankChip handle={writer.handle} />
      </div>
      {writer.bio !== '' && (
        <p className="m-0 type-body leading-normal break-words text-ink-muted">{writer.bio}</p>
      )}
      <div className="flex flex-wrap items-center gap-2 pt-2">
        {!isOwner && (
          <FollowButton
            target={{ kind: 'writer', handle: writer.handle }}
            targetLabel={writer.displayName}
          />
        )}
        <Link
          to={profileHref}
          className="inline-flex h-11 items-center px-3 type-body font-semibold text-link underline hover:text-link-hover"
        >
          {t('storyPage.seeProfile')}
        </Link>
      </div>
      {/* Board New-Story: followers are counted in public, but only the writer sees who. */}
      <p className="m-0 type-meta leading-[18px] text-ink-muted">
        {t('storyPage.followersPublicNote', { name: writer.displayName })}
      </p>
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
        <WriterCard writer={story.writer} isOwner={story.isOwner} />
      ) : (
        <ClassicAuthorCard author={story.writer.classicAuthor} />
      )}
      {/* TRANSLATE-1b: only for a story in several languages. */}
      <AboutEditionCard story={story} />
      <StoryAdSlot story={story} />
      {/* Report shows only to readers: the owner can't report their own story. */}
      {!story.isOwner && (
        <div className="relative flex items-center">
          <ReportButton itemType="story" itemReference={story.id} itemLabel={story.title} />
        </div>
      )}
    </aside>
  );
}
