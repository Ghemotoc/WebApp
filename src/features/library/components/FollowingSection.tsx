/**
 * FollowingSection: "What you follow", the writers and stories the reader follows, each with its
 * Following button (story S1-E4-03; board New-Library, bundle CALM-7c; follows from S1-E6-05).
 *
 * Board values: the heading with "Notification settings" at the top right (Settings at its
 * notifications part, GAPS-6), the line "A notification comes when they publish something new.",
 * then "Writers · 4" and "Stories · 4" as subheadings over rows split by the hairline. A writer
 * row: the avatar, the name and when they last published. A story row: a 48 px cover, the title,
 * a meta line with "New" in bold for a story updated in the last 7 days, the writer and the last
 * update. Each row ends with the shared FollowButton (which unfollows in place). No cards.
 * Who uses it: LibraryPage. What it calls: useMyFollows → my_follows().
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { resolveCoverChoice } from '@/components/covers/automaticCover';
import { DrawnCover } from '@/components/covers/DrawnCover';
import { MetaLine, type MetaFact } from '@/components/ui/MetaLine';
import { PersonAvatar } from '@/features/avatars/components/PersonAvatar';
import { timeAgo } from '@/features/comments/lib/timeAgo';
import type { ListedStory } from '@/features/discovery/api/storyLists';
import { FollowButton } from '@/features/people/components/FollowButton';

import type { FollowedWriter } from '../api/library';
import { useMyFollows } from '../hooks/useLibraryOverview';
import { useLibraryTranslation } from '../registerLibraryTranslations';

/** A story counts as new on this list for 7 days after its latest chapter (board's "New" pill). */
const newForMilliseconds = 7 * 24 * 3600 * 1000;

/**
 * Whether a story's latest chapter came out in the last 7 days.
 *
 * @param isoDate - the latest chapter's date, or null
 * @returns true for a recent one
 */
function isRecent(isoDate: string | null): boolean {
  return isoDate !== null && Date.now() - new Date(isoDate).getTime() < newForMilliseconds;
}

/** "Last update 3 days ago", or "Nothing published yet". */
function useLastUpdate() {
  const { t, i18n } = useLibraryTranslation();
  return (isoDate: string | null) =>
    isoDate === null
      ? t('following.nothingYet')
      : t('following.lastUpdate', { when: timeAgo(isoDate, i18n.language) });
}

/** One writer row. */
function WriterRow({ writer }: { writer: FollowedWriter }) {
  const lastUpdate = useLastUpdate();
  return (
    <li className="flex items-center gap-3.5 border-t border-(--hairline) py-3">
      <PersonAvatar name={writer.displayName} handle={writer.handle} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Link
          to={`/u/${encodeURIComponent(writer.handle)}`}
          className="font-semibold break-words text-heading no-underline hover:underline"
        >
          {writer.displayName}
        </Link>
        <MetaLine facts={[{ text: lastUpdate(writer.lastPublishedAt) }]} />
      </div>
      <FollowButton
        target={{ kind: 'writer', handle: writer.handle }}
        targetLabel={writer.displayName}
      />
    </li>
  );
}

/** One story row. */
function StoryRow({ story }: { story: ListedStory }) {
  const { t } = useLibraryTranslation();
  const lastUpdate = useLastUpdate();
  const updated = story.lastChapterPublishedAt;
  // "New" in bold first for a story updated in the last 7 days (the meta line's state).
  const facts: MetaFact[] = [
    { text: isRecent(updated) ? t('following.new') : '', kind: 'state' },
    { text: story.writer.displayName },
    { text: lastUpdate(updated) },
  ];
  return (
    <li className="flex items-center gap-3.5 border-t border-(--hairline) py-3">
      <DrawnCover
        title={story.title}
        choice={resolveCoverChoice(story)}
        size="tile"
        isDecorative
        className="w-12 shrink-0"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Link
          to={`/s/${story.slug}`}
          className="font-semibold break-words text-heading no-underline hover:underline"
        >
          {story.title}
        </Link>
        <MetaLine facts={facts} />
      </div>
      <FollowButton target={{ kind: 'story', slug: story.slug }} targetLabel={story.title} />
    </li>
  );
}

/** A subheading and its rows, or the line that says how to fill them. */
function FollowGroup(props: { heading: string; emptyText: string; children: ReactNode[] }) {
  return (
    <div className="flex min-w-0 flex-col">
      <h3 className="m-0 mb-1 type-subheading">{props.heading}</h3>
      {props.children.length === 0 ? (
        <p className="m-0 type-body text-body">{props.emptyText}</p>
      ) : (
        <ul className="m-0 list-none p-0">{props.children}</ul>
      )}
    </div>
  );
}

/** The heading with "Notification settings" at the top right, and the line under it. */
function FollowingHeading() {
  const { t } = useLibraryTranslation();
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h2 id="library-following-heading" className="m-0 type-heading">
          {t('following.heading')}
        </h2>
        <Link
          to="/settings#notifications"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-link underline"
        >
          {t('following.notificationSettings')}
        </Link>
      </div>
      <p className="m-0 type-body text-body">{t('following.intro')}</p>
    </div>
  );
}

/**
 * Renders the section, or nothing while it loads.
 *
 * @returns the section
 */
export function FollowingSection() {
  const { t } = useLibraryTranslation();
  const { follows } = useMyFollows();
  if (follows === null) return null;
  return (
    <section aria-labelledby="library-following-heading" className="flex min-w-0 flex-col gap-7">
      <FollowingHeading />
      <FollowGroup
        heading={t('following.writers', { count: follows.writers.length })}
        emptyText={t('following.noWriters')}
      >
        {follows.writers.map((writer) => (
          <WriterRow key={writer.handle} writer={writer} />
        ))}
      </FollowGroup>
      <FollowGroup
        heading={t('following.stories', { count: follows.stories.length })}
        emptyText={t('following.noStories')}
      >
        {follows.stories.map((story) => (
          <StoryRow key={story.slug} story={story} />
        ))}
      </FollowGroup>
    </section>
  );
}
