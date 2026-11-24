/**
 * StoryWriterCard: "The writer" at the top of the story page's side column (story S1-E5-05;
 * redrawn to board B01 in bundle 2, user story 2.1).
 *
 * In the board's order: the heading "The writer"; the 72 px picture beside the name (a link to
 * the profile) and "Writes mystery and fantasy" (the categories of the writer's stories, the most
 * used first); the bio; "1,284 followers · 19.5k reads" (the same public totals the profile
 * shows); "Writing rank: Storyteller" as words, not a pill (IDEAS-3a); Follow (S1-E6-05; not on
 * one's own story) and "See profile"; then the line on who can see the followers.
 * Who uses it: StorySideColumn. What it calls: useWriterProfile → get_writer_profile() for the
 * reads and the categories, useFollow → follow_state() for the follower total, useProfileRank →
 * profile_rank() for the rank. Each part waits quietly for its answer and is left out on an error.
 */
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { MetaLine, type MetaFact } from '@/components/ui/MetaLine';
import { useForumsTranslation } from '@/features/forums/registerForumsTranslations';
import { useProfileRank } from '@/features/forums/hooks/useWriterRank';
import { FollowButton } from '@/features/people/components/FollowButton';
import { ProfileAvatar } from '@/features/people/components/ProfileAvatar';
import type { ProfileStory } from '@/features/people/api/writerProfile';
import { useFollow } from '@/features/people/hooks/useFollow';
import { useWriterProfile } from '@/features/people/hooks/useWriterProfile';

import type { StoryPageData } from '../api/storyPage';

/** The writer as the story page knows them. */
type StoryWriter = StoryPageData['writer'];

/**
 * The two categories the writer uses most, most used first.
 *
 * @param stories - the writer's public stories
 * @returns zero, one or two category slugs
 */
function topCategories(stories: ProfileStory[]): string[] {
  // Step 1: count the stories in each category.
  const counts = new Map<string, number>();
  for (const story of stories) {
    counts.set(story.categorySlug, (counts.get(story.categorySlug) ?? 0) + 1);
  }
  // Step 2: the two biggest; a tie keeps the order the profile lists them in.
  const ordered = [...counts.entries()].sort((first, second) => second[1] - first[1]);
  return ordered.slice(0, 2).map(([slug]) => slug);
}

/**
 * "Writes mystery and fantasy" (board B01), from the writer's categories.
 *
 * @returns the line, or null while the writer has no public story
 */
function writesLine(stories: ProfileStory[], t: TFunction<'reading'>, language: string) {
  const names = topCategories(stories).map((slug) =>
    t(`categories.${slug}`, { ns: 'writing', defaultValue: slug }).toLocaleLowerCase(language),
  );
  if (names.length === 0) return null;
  if (names.length === 1) return t('storyPage.writesOne', { first: names[0] });
  return t('storyPage.writesTwo', { first: names[0], second: names[1] });
}

/**
 * "1,284 followers · 19.5k reads": the public totals, each once its answer is in.
 *
 * @returns the line
 */
function WriterTotals({ handle, reads }: { handle: string; reads: number | null }) {
  const { t, i18n } = useTranslation('reading');
  const follow = useFollow({ kind: 'writer', handle });
  const compact = new Intl.NumberFormat(i18n.language, { notation: 'compact' });
  const whole = new Intl.NumberFormat(i18n.language);
  const facts: MetaFact[] = [];
  const followers = follow.state?.followerCount ?? null;
  if (followers !== null) {
    facts.push({
      text: t('storyPage.writerFollowers', { count: followers, value: whole.format(followers) }),
    });
  }
  if (reads !== null) {
    facts.push({
      text: t('storyPage.writerReads', { count: reads, value: compact.format(reads) }),
    });
  }
  return <MetaLine facts={facts} />;
}

/**
 * "Writing rank: Storyteller", in words (board B01), once the writer has a rank to show.
 *
 * @returns the line, or nothing
 */
function WritingRankLine({ handle }: { handle: string }) {
  const { t } = useTranslation('reading');
  const { t: forumsText } = useForumsTranslation();
  const rank = useProfileRank(handle).data ?? null;
  if (rank === null) return null;
  return (
    <p
      data-testid="rank-chip"
      className="m-0 type-meta text-ink-muted"
      title={forumsText('rank.chipTitle')}
    >
      {t('storyPage.writingRankLabel')}{' '}
      <b className="font-semibold text-ink">{forumsText(`rank.names.${rank.rank}`)}</b>
    </p>
  );
}

/**
 * The picture beside the name and the "Writes …" line.
 *
 * @returns the row
 */
function WriterIdentity(props: { writer: StoryWriter; writes: string | null }) {
  const { writer, writes } = props;
  return (
    <div className="flex items-center gap-3">
      <ProfileAvatar name={writer.displayName} handle={writer.handle} isSmall />
      <div className="flex min-w-0 flex-col">
        <Link
          to={`/u/${encodeURIComponent(writer.handle)}`}
          className="type-subheading break-words text-ink-heading no-underline hover:underline"
        >
          {writer.displayName}
        </Link>
        {writes !== null && <p className="m-0 type-meta text-ink-muted">{writes}</p>}
      </div>
    </div>
  );
}

/**
 * Renders the card.
 *
 * @param props.writer - the story's writer
 * @param props.isOwner - true on the writer's own story, which has no Follow
 * @returns the section
 */
export function StoryWriterCard({ writer, isOwner }: { writer: StoryWriter; isOwner: boolean }) {
  const { t, i18n } = useTranslation('reading');
  const { profile } = useWriterProfile(writer.handle);
  const writes = profile === null ? null : writesLine(profile.stories, t, i18n.language);
  return (
    <section aria-labelledby="story-writer-heading" className="flex flex-col gap-3">
      <h2 id="story-writer-heading" className="m-0 type-heading text-ink-heading">
        {t('storyPage.writerHeading')}
      </h2>
      <WriterIdentity writer={writer} writes={writes} />
      {writer.bio !== '' && <p className="m-0 type-body break-words text-ink">{writer.bio}</p>}
      <WriterTotals handle={writer.handle} reads={profile?.counts.reads ?? null} />
      <WritingRankLine handle={writer.handle} />
      <div className="flex flex-wrap items-center gap-3">
        {!isOwner && (
          <FollowButton
            target={{ kind: 'writer', handle: writer.handle }}
            targetLabel={writer.displayName}
          />
        )}
        <Link
          to={`/u/${encodeURIComponent(writer.handle)}`}
          className="inline-flex h-11 items-center px-3 type-body font-semibold text-ink underline underline-offset-2"
        >
          {t('storyPage.seeProfile')}
        </Link>
      </div>
      {/* Followers are counted in public, but only the writer sees who (board B01). */}
      <p className="m-0 type-meta text-ink-muted">
        {t('storyPage.followersPublicNote', { name: writer.displayName })}
      </p>
    </section>
  );
}
