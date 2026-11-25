/**
 * ProfileStoryRow: one of a writer's stories as a row (boards C04 and C05, bundle 3 of "Build: the
 * full design as user stories"; story S1-E5-05).
 *
 * As the boards draw it: a 56 px cover, the title linking to the story, a meta line with the state
 * in bold, the category and the chapters ("Completed · Fiction · 15 chapters"), the blurb, and
 * "Follow story" on the right (S1-E6-05). The boards' per-story reads aren't drawn:
 * get_writer_profile() and browse_stories() count reads for the writer only (docs/board-fixes.md).
 * Who uses it: ProfileStories (the profile's five rows) and ProfileStoriesPage (every story, board
 * C05). What it calls: FollowButton → follow_story(), StoryCoverArt for an uploaded cover.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import type { DrawnCoverChoice } from '@/components/covers/coverDesigns';
import { DrawnCover } from '@/components/covers/DrawnCover';
import { MetaLine } from '@/components/ui/MetaLine';
import { StoryCoverArt } from '@/features/pictures/components/StoryCoverArt';

import type { ProfileStory } from '../api/writerProfile';
import { usePeopleTranslation } from '../registerPeopleTranslations';

import { FollowButton } from './FollowButton';

/** What one row needs. */
export interface ProfileStoryRowProps {
  story: ProfileStory;
  cover: DrawnCoverChoice;
  /** False on one's own profile: a writer doesn't follow their own story. */
  showsFollow: boolean;
}

/**
 * Renders one row: cover, title, meta line, blurb and Follow story.
 *
 * @param props.story - the story (a ProfileStory or a ListedStory: both carry these fields)
 * @param props.cover - the drawn cover worked out with its neighbours
 * @param props.showsFollow - whether to draw Follow story
 * @returns the list item
 */
export function ProfileStoryRow({ story, cover, showsFollow }: ProfileStoryRowProps) {
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
