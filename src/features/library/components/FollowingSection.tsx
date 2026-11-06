/**
 * FollowingSection: "What you follow", the writers and stories the reader follows, each with its
 * Following button (story S1-E4-03; board 3.7 Library; follows from S1-E6-05).
 *
 * Board values: two white cards side by side (stacked on phones), "Writers (4)" and "Stories (4)",
 * one row per follow with a fine line between rows: the initial or the cover, the name, a line
 * about the latest chapter, a "New" pill for a story updated in the last 7 days, and the shared
 * FollowButton (which unfollows in place). The board's "Notification settings" link joins with
 * the email settings (S1-E7-02).
 * Who uses it: LibraryPage. What it calls: useMyFollows → my_follows().
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { resolveCoverChoice } from '@/components/covers/automaticCover';
import { DrawnCover } from '@/components/covers/DrawnCover';
import { Doodle } from '@/components/ui/Doodle';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { InfoPill } from '@/components/ui/InfoPill';
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
    <li className="flex items-center gap-3 border-t border-border py-3 first:border-t-0">
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary font-heading font-bold text-on-primary"
      >
        {writer.displayName.slice(0, 1).toLocaleUpperCase()}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <Link
          to={`/u/${encodeURIComponent(writer.handle)}`}
          className="font-semibold break-words text-heading no-underline hover:underline"
        >
          {writer.displayName}
        </Link>
        <span className="text-[13px] text-meta">{lastUpdate(writer.lastPublishedAt)}</span>
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
  const isNew = isRecent(updated);
  return (
    <li className="flex items-center gap-3 border-t border-border py-3 first:border-t-0">
      <DrawnCover
        title={story.title}
        choice={resolveCoverChoice(story)}
        size="tile"
        isDecorative
        className="w-[48px] shrink-0"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Link
          to={`/s/${story.slug}`}
          className="font-semibold break-words text-heading no-underline hover:underline"
        >
          {story.title}
        </Link>
        <span className="text-[13px] text-meta">
          {story.writer.displayName} · {lastUpdate(updated)}
        </span>
      </div>
      {isNew && <InfoPill tone="gold">{t('following.new')}</InfoPill>}
      <FollowButton target={{ kind: 'story', slug: story.slug }} targetLabel={story.title} />
    </li>
  );
}

/** A card with a heading and its rows, or the line that says how to fill it. */
function FollowCard(props: { heading: string; emptyText: string; children: ReactNode[] }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-card border border-border bg-surface p-5 shadow-card">
      <h3 className="m-0 font-heading text-lg font-bold text-heading">{props.heading}</h3>
      {props.children.length === 0 ? (
        <p className="m-0 text-sm text-body">{props.emptyText}</p>
      ) : (
        <ul className="m-0 list-none p-0">{props.children}</ul>
      )}
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
    <section aria-labelledby="library-following-heading" className="flex flex-col gap-4">
      <div className="flex items-center gap-8">
        <div className="flex min-w-0 flex-col gap-1">
          <Eyebrow>{t('following.eyebrow')}</Eyebrow>
          <h2
            id="library-following-heading"
            className="m-0 font-heading text-[28px] font-bold text-heading"
          >
            {t('following.heading')}
          </h2>
          <p className="m-0 text-sm text-body">{t('following.intro')}</p>
        </div>
        {/* The board's butterfly beside the heading, clear of its words (LOOK-5). */}
        <Doodle
          name="butterfly"
          kind="widget"
          on="What you follow"
          hideBelow="wide"
          className="w-20 shrink-0 rotate-[10deg]"
        />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <FollowCard
          heading={t('following.writers', { count: follows.writers.length })}
          emptyText={t('following.noWriters')}
        >
          {follows.writers.map((writer) => (
            <WriterRow key={writer.handle} writer={writer} />
          ))}
        </FollowCard>
        <FollowCard
          heading={t('following.stories', { count: follows.stories.length })}
          emptyText={t('following.noStories')}
        >
          {follows.stories.map((story) => (
            <StoryRow key={story.slug} story={story} />
          ))}
        </FollowCard>
      </div>
    </section>
  );
}
