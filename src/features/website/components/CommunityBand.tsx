/**
 * CommunityBand: "Talk about stories in the forums" on the home page (bundle LOOK-3; board
 * Website-Home, "Community").
 *
 * Board values: a white card band; on one side the text, "Spaces people started" as chips and
 * "Browse the forums"; on the other the busiest threads this week, each with its forum, title and
 * "Started by … · n replies", with the puppy doodle peeking over the list. The words come from the
 * CMS; the threads and spaces come from public_forum_highlights(), which lists only the
 * platform's own forums and public 16+ spaces, never a class, private or under-16 space, and only
 * people who may be put on show. With no threads the list is left out.
 * Who shows it: WebsiteHomePage. What it calls: useForumHighlights, BandText, BandButtons.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Doodle } from '@/components/ui/Doodle';
import type { HomeBand } from '@/schemas/websiteContent';

import type { ForumHighlights } from '../api/forumHighlights';
import { useForumHighlights } from '../hooks/useForumHighlights';

import { BandButtons } from './BandButtons';
import { BandText } from './BandText';

/** "Spaces people started", as links. */
function SpaceChips({ spaces }: { spaces: ForumHighlights['spaces'] }) {
  const { t } = useTranslation();
  if (spaces.length === 0) return null;
  return (
    <nav aria-label={t('website.spacesLabel')} className="flex flex-col gap-2.5">
      <p className="m-0 eyebrow">{t('website.spacesLabel')}</p>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {spaces.map((space) => (
          <li key={space.slug}>
            <Link
              to={`/spaces/${encodeURIComponent(space.slug)}`}
              className="inline-flex h-9 items-center rounded-full border border-control-border bg-surface px-3.5 text-sm leading-none font-semibold text-heading no-underline hover:bg-tint"
            >
              {space.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** The busiest threads, with the puppy peeking over the list's top edge. */
function ThreadList({ threads }: { threads: ForumHighlights['threads'] }) {
  const { t } = useTranslation();
  if (threads.length === 0) return null;
  return (
    <div className="relative mt-14 self-start lg:mt-10">
      <Doodle
        name="peeking-puppy"
        kind="widget"
        on="home-forum-threads"
        hideBelow="wide"
        className="absolute -top-[68px] right-8 w-[92px]"
      />
      <ul
        aria-label={t('website.busyThreads')}
        className="relative z-10 m-0 flex list-none flex-col rounded-[24px] border border-border bg-surface p-2 shadow-card"
      >
        {threads.map((thread) => (
          <li
            key={`${thread.forumSlug}-${String(thread.number)}`}
            className="flex flex-col gap-1 border-b border-border p-4 last:border-b-0"
          >
            <span className="text-[13px] font-semibold text-meta">{thread.forumName}</span>
            <Link
              to={`/forums/${encodeURIComponent(thread.forumSlug)}/${String(thread.number)}`}
              className="font-heading text-lg font-bold break-words text-heading no-underline hover:underline"
            >
              {thread.title}
            </Link>
            <span className="text-[13px] text-body">
              {t('website.threadLine', { name: thread.starterName, count: thread.replyCount })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Renders the band.
 *
 * @param props.band - the band's words
 * @param props.language - the words' language
 * @returns the band
 */
export function CommunityBand({ band, language }: { band: HomeBand; language: string }) {
  const { highlights } = useForumHighlights(language);
  return (
    <section
      id="community"
      aria-labelledby="community-band-heading"
      className="grid scroll-mt-6 gap-10 lg:grid-cols-2"
    >
      <div className="flex flex-col gap-6" lang={language}>
        <BandText band={band} headingId="community-band-heading" tone="page" />
        <SpaceChips spaces={highlights?.spaces ?? []} />
        <BandButtons
          tone="page"
          first={{ label: band.button, to: '/forums' }}
          second={{ label: band.secondaryButton, to: '/spaces' }}
        />
      </div>
      <ThreadList threads={highlights?.threads ?? []} />
    </section>
  );
}
