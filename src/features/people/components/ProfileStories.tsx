/**
 * ProfileStories: "Stories by <name>", the writer's published stories as rows (story S1-E5-05;
 * board C04 of the design books, bundle 3 of "Build: the full design as user stories").
 *
 * Each row, as the board draws it: a 56 px cover, the title linking to the story, a meta line
 * with the state in bold, the category and the chapters ("Completed · Fiction · 15 chapters"), the
 * blurb, and "Follow story" on the right (S1-E6-05). At most five rows show; "See every story" at
 * the top right opens /u/<username>/stories with the rest. A list of rows, not a shelf of covers,
 * so CLAUDE.md rule 20 (one scrolling line of at most 20) doesn't apply; the See all page keeps
 * every story. The board's per-story reads aren't drawn: get_writer_profile() counts reads for
 * the writer only (docs/board-fixes.md). The database already left out what this reader may not
 * see (rating, blocks, moderation).
 * Who uses it: WriterProfilePage.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { designsForRow, resolveCoverChoice } from '@/components/covers/automaticCover';
import type { DrawnCoverChoice } from '@/components/covers/coverDesigns';
import { DrawnCover } from '@/components/covers/DrawnCover';
import { EmptyState } from '@/components/ui/EmptyState';
import { MetaLine } from '@/components/ui/MetaLine';
import { useSession } from '@/features/auth/hooks/useSession';
import { StoryCoverArt } from '@/features/pictures/components/StoryCoverArt';

import type { ProfileStory, WriterProfile } from '../api/writerProfile';
import { usePeopleTranslation } from '../registerPeopleTranslations';

import { FollowButton } from './FollowButton';

/** How many rows the profile shows before "See every story" (board C04). */
const rowsShown = 5;

/** What one row needs. */
interface ProfileStoryRowProps {
  story: ProfileStory;
  cover: DrawnCoverChoice;
  /** False on one's own profile: a writer doesn't follow their own story. */
  showsFollow: boolean;
}

/** One row: cover, title, meta line, blurb and Follow story. */
function ProfileStoryRow({ story, cover, showsFollow }: ProfileStoryRowProps) {
  const { t } = usePeopleTranslation();
  const { t: tWriting } = useTranslation('writing');
  // The state first, in bold, then the category and the chapters (board C04's meta line).
  const facts = [
    { text: tWriting(`status.${story.completionStatus}`), kind: 'state' as const },
    { text: tWriting(`categories.${story.categorySlug}`, { defaultValue: story.categorySlug }) },
    { text: t('profile.storyMeta', { count: story.chapterCount }) },
  ];
  return (
    <li className="flex flex-wrap items-start gap-4 border-t border-(--hairline) py-4 md:flex-nowrap">
      <StoryCoverArt
        story={story}
        className="w-14 shrink-0"
        drawn={
          <DrawnCover
            title={story.title}
            choice={cover}
            size="tile"
            isDecorative
            className="w-14 shrink-0"
          />
        }
      />
      <div className="flex min-w-0 flex-1 basis-48 flex-col gap-1">
        <Link
          to={`/s/${encodeURIComponent(story.slug)}`}
          className="font-semibold break-words text-ink-heading no-underline hover:underline"
        >
          {story.title}
        </Link>
        <MetaLine facts={facts} />
        {story.blurb !== '' && (
          <p className="m-0 type-body break-words text-ink-muted">{story.blurb}</p>
        )}
      </div>
      {showsFollow && (
        <div className="shrink-0">
          <FollowButton target={{ kind: 'story', slug: story.slug }} targetLabel={story.title} />
        </div>
      )}
    </li>
  );
}

/** The heading with "See every story" at the top right. */
function StoriesHeading({ profile }: { profile: WriterProfile }) {
  const { t } = usePeopleTranslation();
  return (
    <div className="mb-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <h2 id="profile-stories-heading" className="m-0 type-heading">
        {t('profile.storiesHeading', { name: profile.displayName })}
      </h2>
      <Link
        to={`/u/${encodeURIComponent(profile.handle)}/stories`}
        className="inline-flex min-h-11 items-center type-body font-semibold text-link underline"
      >
        {t('profile.seeEveryStory')}
      </Link>
    </div>
  );
}

/**
 * Renders the rows, or the empty state when nothing is published.
 *
 * @param props.profile - the profile on the page
 * @returns the section
 */
export function ProfileStories({ profile }: { profile: WriterProfile }) {
  const { t } = usePeopleTranslation();
  const { userId } = useSession();
  if (profile.stories.length === 0) {
    const description = profile.isMe
      ? t('profile.noStoriesMine')
      : t('profile.noStoriesBody', { name: profile.displayName });
    return <EmptyState title={t('profile.noStoriesTitle')} description={description} />;
  }
  // Covers are worked out together so neighbours never share a design (S1-E3-13).
  const shown = profile.stories.slice(0, rowsShown);
  const covers = designsForRow(shown);
  return (
    <section aria-labelledby="profile-stories-heading" className="flex min-w-0 flex-col">
      <StoriesHeading profile={profile} />
      <ul className="m-0 list-none p-0">
        {shown.map((story, index) => (
          <ProfileStoryRow
            key={story.slug}
            story={story}
            cover={covers[index] ?? resolveCoverChoice(story)}
            // Follow story only for someone signed in who isn't the writer: a visitor already has
            // one "Get in to follow" beside the name, and one on every row would say it six times.
            showsFollow={userId !== null && !profile.isMe}
          />
        ))}
      </ul>
    </section>
  );
}
