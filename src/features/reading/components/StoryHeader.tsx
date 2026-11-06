/**
 * StoryHeader: the cover, pills, title, writer, blurb and tags at the top of the story page
 * (story S1-E3-05; board Story 3.4, the story header).
 *
 * Board values: a 220 × 308 cover with the words beside it (36 px apart, wrapping under the
 * cover on narrow screens), the pill row (Fiction, Ongoing only while the story is still being
 * written, the rating and label pills from S1-E3-06; "Web and app" joins with S1-E3-08), the H1 in Bricolage 800 at
 * clamp(36px, 4.4vw, 64px), "by <name>" at 16 px, the blurb at 17 px / 1.6 up to 640 px wide,
 * the content note box when the writer left one (S1-E3-06: readers see it before they open the
 * story), the tag chips, each a link to its tag page (S1-E5-01), "Follow story" (S1-E6-05) and,
 * under the writer's name, the stats row (StoryStats, S1-E5-03). Under the cover, the rank badges
 * (RankBadges, CMS-1g). Under the stats, "Start reading" or "Continue chapter n" and the
 * Library drop-down (StoryReadingActions, S1-E4-03), then Follow and, since IDEAS-1c, Share for the
 * whole story (StoryShareButton).
 * Who uses it: StoryPage.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { resolveCoverChoice } from '@/components/covers/automaticCover';
import { DrawnCover } from '@/components/covers/DrawnCover';
import { Doodle } from '@/components/ui/Doodle';
import { StoryCoverArt } from '@/features/pictures/components/StoryCoverArt';
import { InfoPill } from '@/components/ui/InfoPill';
import { listAddress, plainList } from '@/features/discovery/lib/listAddresses';
import { StoryReadingActions } from '@/features/library/components/StoryReadingActions';
import { FollowButton } from '@/features/people/components/FollowButton';
import { StoryShareButton } from '@/features/sharing/components/StoryShareButton';
import type { SharedStory } from '@/features/sharing/lib/sharedStory';
import { RankBadges } from '@/features/tags/components/RankBadges';
import { useTagCatalogue } from '@/features/tags/hooks/useTagCatalogue';

import type { StoryPageData } from '../api/storyPage';

import { StoryLabelPills } from './StoryLabelPills';
import { StoryStats } from './StoryStats';

/**
 * The story's tags, each a link to the page of stories with that tag (S1-E5-01). They are links
 * that look like chips, because each opens a page (DoD pill system).
 *
 * @param tags - the story's tags, as the writer typed them
 * @returns the list, or nothing when the story has no tags
 */
function StoryTagLinks({ tags }: { tags: string[] }) {
  const { t } = useTranslation('reading');
  // CMS-1e: each tag in the interface language; the link keeps the stored name, which the tag
  // page finds in any language.
  const { showTag } = useTagCatalogue();
  if (tags.length === 0) return null;
  return (
    <ul aria-label={t('storyPage.tags')} className="m-0 flex list-none flex-wrap gap-2 p-0">
      {tags.map((tag) => (
        <li key={tag}>
          <Link
            to={listAddress(plainList('tag', tag))}
            className="relative inline-flex h-9 items-center rounded-full border border-control-border bg-surface px-3.5 text-sm leading-none font-semibold text-heading no-underline after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-[''] hover:bg-tint"
          >
            {showTag(tag)}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * What sharing the whole story needs (IDEAS-1c): no user ID, only what the link preview shows.
 *
 * @param story - the story page's data
 * @returns the shared story
 */
function sharedStoryOf(story: StoryPageData): SharedStory {
  return {
    slug: story.slug,
    title: story.title,
    writerName: story.writer.displayName,
    blurb: story.blurb,
    rating: story.labels.rating,
    coverBackground: story.drawnCover?.background ?? null,
  };
}

/**
 * The pill row: the category, "Ongoing" while the story is still being written, and the rating
 * and label pills (S1-E3-06). A finished story shows no status pill (Robert, 6 Nov 2026:
 * "Completed" is a filter, not a tag on pages); the "Status" row under "Labels from the writer"
 * still says it.
 *
 * @returns the pills
 */
function StoryPills({ story }: { story: StoryPageData }) {
  const { t } = useTranslation('reading');
  return (
    <div className="flex flex-wrap gap-1.5">
      <InfoPill tone="plum">
        {t(`categories.${story.categorySlug}`, {
          ns: 'writing',
          defaultValue: story.categorySlug,
        })}
      </InfoPill>
      {story.completionStatus === 'ongoing' && (
        <InfoPill tone="sage">{t('status.ongoing', { ns: 'writing' })}</InfoPill>
      )}
      <StoryLabelPills labels={story.labels} />
    </div>
  );
}

/**
 * Start or continue reading and the Library drop-down (S1-E4-03), then "Follow story" (S1-E6-05),
 * none of them on one's own story, and Share (IDEAS-1c) for every public story.
 *
 * @returns the actions
 */
function StoryActions({ story }: { story: StoryPageData }) {
  return (
    <>
      <StoryReadingActions
        storySlug={story.slug}
        firstChapterCode={
          story.chapters.find((chapter) => chapter.status === 'published')?.code ?? null
        }
        isOwner={story.isOwner}
      />
      {story.isPublic && (
        <div className="flex flex-wrap items-center gap-3">
          {!story.isOwner && (
            <FollowButton target={{ kind: 'story', slug: story.slug }} targetLabel={story.title} />
          )}
          {/* IDEAS-1c: share the whole story, for readers and the writer alike. */}
          <StoryShareButton story={sharedStoryOf(story)} />
        </div>
      )}
    </>
  );
}

/**
 * Renders the header.
 *
 * @returns the header block
 */
export function StoryHeader({ story }: { story: StoryPageData }) {
  const { t } = useTranslation('reading');
  const cover = resolveCoverChoice(story);
  return (
    // Board Story 3.4: the cover on the left and the words beside it, wrapping under the cover
    // on narrow screens (Robert, 6 Nov 2026: title, Start reading, Follow and blurb beside the
    // cover on desktop).
    <header className="flex flex-wrap items-start gap-9">
      {/* Step 1: the cover, with the story's ranks in its tags under it (CMS-1g). */}
      <div className="flex flex-[0_0_220px] flex-col gap-3">
        <StoryCoverArt
          story={story}
          className="w-[220px]"
          drawn={
            <DrawnCover
              title={story.title}
              penName={story.writer.displayName}
              choice={cover}
              size="card"
              isDecorative
              className="w-[220px]"
            />
          }
        />
        <RankBadges slug={story.slug} />
        {/* The board's music notes sit under the cover (Story 3.4: 54 px in). In the flow of
            the cover's column, so they can't reach the words beside it on any width. */}
        <Doodle
          name="music-notes"
          kind="background"
          hideBelow="wide"
          className="mt-4 ml-[54px] block w-28 -rotate-6"
        />
      </div>
      {/* Step 2: the words, beside the cover (or under it on narrow screens). */}
      <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-4">
        <StoryPills story={story} />
        <h1 className="m-0 text-[clamp(36px,4.4vw,64px)] leading-[0.98] font-extrabold tracking-[-0.025em] break-words">
          {story.title}
        </h1>
        <p className="m-0 text-base text-body">
          {t('storyPage.by')}{' '}
          <strong className="font-bold text-heading">{story.writer.displayName}</strong>
        </p>
        <StoryStats story={story} />
        <StoryActions story={story} />
        {story.blurb !== '' && (
          <p className="m-0 max-w-[640px] text-[17px] leading-[1.6] text-body">{story.blurb}</p>
        )}
        {story.labels.contentNote !== '' && (
          <div className="flex max-w-[640px] flex-col gap-1 rounded-card border border-border bg-tint px-4 py-3">
            <p className="m-0 eyebrow">{t('storyPage.contentNoteHeading')}</p>
            <p className="m-0 text-[15px] leading-normal text-body">{story.labels.contentNote}</p>
          </div>
        )}
        <StoryTagLinks tags={story.tags} />
      </div>
    </header>
  );
}
