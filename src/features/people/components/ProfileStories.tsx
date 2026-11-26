/**
 * ProfileStories: "Stories by <name>", the writer's published stories as rows (story S1-E5-05;
 * board C04 of the design books, bundle 3 of "Build: the full design as user stories").
 *
 * Each row is a ProfileStoryRow (cover, title, meta line, blurb, Follow story). At most five rows show; "See every story" at
 * the top right opens /u/<username>/stories with the rest. A list of rows, not a shelf of covers,
 * so CLAUDE.md rule 20 (one scrolling line of at most 20) doesn't apply; the See all page keeps
 * every story. The board's per-story reads aren't drawn: get_writer_profile() counts reads for
 * the writer only (docs/board-fixes.md). The database already left out what this reader may not
 * see (rating, blocks, moderation).
 * Who uses it: WriterProfilePage. The See all page (board C05) is ProfileStoriesPage, with the
 * same rows.
 */
import { Link } from 'react-router';

import { designsForRow, resolveCoverChoice } from '@/components/covers/automaticCover';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSession } from '@/features/auth/hooks/useSession';

import type { WriterProfile } from '../api/writerProfile';
import { usePeopleTranslation } from '../registerPeopleTranslations';

import { ProfileStoryRow } from './ProfileStoryRow';

/** How many rows the profile shows before "See every story" (board C04). */
const rowsShown = 5;

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
