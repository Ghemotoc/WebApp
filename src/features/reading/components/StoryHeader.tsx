/**
 * StoryHeader: the story page's hero (story S1-E3-05; redrawn to board B01 in bundle 2, user
 * story 2.1).
 *
 * The page's one hero box (Hero): the 240 px cover on the left and, on the right, in the board's
 * order, 12 px apart:
 *   - the breadcrumb "Read / Fiction / title" (StoryBreadcrumb);
 *   - the facts line "Completed · Fiction · No AI · 13+ · Web and app" (lib/storyLabelFacts.ts);
 *   - the title in the display style, with the "Read in" switch beside it (TRANSLATE-1b), then
 *     "by <name>" as a link to the profile and, for a translated classic, who translated it;
 *   - the numbers as a meta line, reads first (StoryStats, S1-E5-03; reads public since bundle 2);
 *   - where the story ranks, as links (RankBadges: its tags, CMS-1g, and its category, S1-E15-05);
 *   - the blurb, the note on which language is shown (StoryLanguageNote), and the tags as
 *     "#mystery" links to their tag pages (S1-E5-01);
 *   - one row of buttons: Start reading, Continue or Read again (main; StoryReadButton), "Tell
 *     the writer you finished it" once finished (IDEAS-1c), Follow (S1-E6-05), "Add to library"
 *     or "In library" (StoryLibraryButton, S1-E4-03), the story's own Like (StoryLikeButton) and
 *     Share (IDEAS-1c); then what following
 *     does, or for a visitor "Get in to follow, like or save". "You are here, 72% through chapter
 *     14" sits in that chapter's row of the list (StoryChapterList).
 * The story-level Like, the public reads total and "Completed" in the facts line are built as
 * drawn on board B01 (Robert, 24 Nov 2026; docs/board-fixes.md).
 * Who uses it: StoryPage.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { resolveCoverChoice } from '@/components/covers/automaticCover';
import { DrawnCover } from '@/components/covers/DrawnCover';
import { StoryCoverArt } from '@/features/pictures/components/StoryCoverArt';
import { Hero } from '@/components/ui/Hero';
import { MetaLine } from '@/components/ui/MetaLine';
import { listAddress, plainList } from '@/features/discovery/lib/listAddresses';
import { useSession } from '@/features/auth/hooks/useSession';
import {
  StoryFinishedThanks,
  StoryLibraryButton,
  StoryReadButton,
} from '@/features/library/components/StoryReadingActions';
import { FollowButton } from '@/features/people/components/FollowButton';
import { StoryShareButton } from '@/features/sharing/components/StoryShareButton';
import type { SharedStory } from '@/features/sharing/lib/sharedStory';
import { RankBadges } from '@/features/tags/components/RankBadges';
import { useTagCatalogue } from '@/features/tags/hooks/useTagCatalogue';

import type { StoryPageData } from '../api/storyPage';

import { ReadInSwitch } from './ReadInSwitch';
import { StoryLanguageNote, TranslationCredit } from './StoryLanguageNote';
import { storyLabelFacts } from '../lib/storyLabelFacts';

import { StoryBreadcrumb } from './StoryBreadcrumb';
import { StoryLikeButton } from './StoryLikeButton';
import { StoryStats } from './StoryStats';

/**
 * The story's tags as plain text links, each to the page of stories with that tag (S1-E5-01;
 * board B01: "#mystery", underlined, semibold, in the ink colour, 16 px apart).
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
    <ul
      aria-label={t('storyPage.tags')}
      className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0"
    >
      {tags.map((tag) => (
        <li key={tag}>
          {/* The 24 px minimum target (rule 9) comes from the line box; hit-target widens the tap to
              44 by 32 (design books, item 10). */}
          <Link
            to={listAddress(plainList('tag', tag))}
            className="hit-target inline-flex min-h-6 items-center type-body font-semibold text-ink underline underline-offset-2"
          >
            {t('storyPage.tagLink', { tag: showTag(tag) })}
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
 * The line under the buttons: what following does for a member, "Get in to follow, like or save"
 * for a visitor (user story 2.1).
 *
 * @returns the line, or nothing on one's own story or while the session loads
 */
function ActionNote({ story }: { story: StoryPageData }) {
  const { t } = useTranslation('reading');
  const { userId, isKnown } = useSession();
  if (!isKnown || story.isOwner || !story.isPublic) return null;
  if (userId === null) {
    return (
      <Link
        to="/sign-in"
        className="hit-target self-start type-body font-semibold text-link underline underline-offset-2"
      >
        {t('storyPage.getInToSave')}
      </Link>
    );
  }
  return <p className="m-0 type-meta text-ink-muted">{t('storyPage.followNote')}</p>;
}

/**
 * The one row of buttons (board B01): read (main), "Tell the writer you finished it" once
 * finished, Follow, the library, Like and Share. The writer sees only Share on their own story; a
 * visitor sees the read button and Share.
 *
 * @returns the row and the lines under it
 */
function StoryActions({ story }: { story: StoryPageData }) {
  const { userId } = useSession();
  const isReader = !story.isOwner;
  const isMember = isReader && userId !== null;
  const firstChapterCode =
    story.chapters.find((chapter) => chapter.status === 'published')?.code ?? null;
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        {isReader && <StoryReadButton storySlug={story.slug} firstChapterCode={firstChapterCode} />}
        {isMember && <MemberButtons story={story} />}
        {/* IDEAS-1c: share the whole story, for readers and the writer alike. */}
        {story.isPublic && <StoryShareButton story={sharedStoryOf(story)} />}
      </div>
      <ActionNote story={story} />
    </>
  );
}

/**
 * A member's buttons between the main one and Share: "Tell the writer you finished it" once
 * finished, Follow, the library and the story's Like (bundle 2, board B01).
 *
 * @returns the buttons
 */
function MemberButtons({ story }: { story: StoryPageData }) {
  return (
    <>
      <StoryFinishedThanks storySlug={story.slug} />
      {story.isPublic && (
        <FollowButton target={{ kind: 'story', slug: story.slug }} targetLabel={story.title} />
      )}
      <StoryLibraryButton storySlug={story.slug} />
      {story.isPublic && <StoryLikeButton storySlug={story.slug} />}
    </>
  );
}

/**
 * The writer's name after "by": a link to their profile (board New-Story), or plain text for a
 * classic, whose author has no account (S1-E5-06).
 *
 * @returns the name
 */
function WriterName({ writer }: { writer: StoryPageData['writer'] }) {
  if (writer.classicAuthor !== null) {
    return <span className="font-semibold text-ink-heading">{writer.displayName}</span>;
  }
  return (
    <Link
      to={`/u/${encodeURIComponent(writer.handle)}`}
      className="hit-target font-semibold text-link"
    >
      {writer.displayName}
    </Link>
  );
}

/**
 * The title with "Read in" beside it (it wraps under the title on narrow screens), then "by
 * <name>" and, for a translated classic, who translated it (TRANSLATE-1b; board TrStory).
 *
 * @returns the title block
 */
function StoryTitleBlock({ story }: { story: StoryPageData }) {
  const { t } = useTranslation('reading');
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1
          id="story-title"
          lang={story.languageCode}
          className="m-0 min-w-0 flex-[1_1_240px] type-display break-words text-ink-heading"
        >
          {story.title}
        </h1>
        <ReadInSwitch editions={story.editions} chapterNumber={null} />
      </div>
      <div className="flex flex-col gap-1">
        <p className="m-0 type-body text-ink-muted">
          {t('storyPage.by')} <WriterName writer={story.writer} />
        </p>
        <TranslationCredit story={story} />
      </div>
    </>
  );
}

/**
 * Renders the header: the page's one glass hero (Hero, CALM-4), with the cover on the left and the
 * words on the right from 900 px, the words under the cover on narrower screens (board New-Story).
 *
 * @returns the hero
 */
export function StoryHeader({ story }: { story: StoryPageData }) {
  const { t } = useTranslation('reading');
  const cover = resolveCoverChoice(story);
  return (
    <Hero labelledBy="story-title" className="lg:p-12">
      <header className="grid items-start gap-8 min-[900px]:grid-cols-[240px_minmax(0,1fr)] min-[900px]:gap-12">
        {/* Step 1: the cover. */}
        <div className="w-[240px] max-w-full">
          <StoryCoverArt
            story={story}
            className="w-full"
            drawn={
              <DrawnCover
                title={story.title}
                penName={story.writer.displayName}
                choice={cover}
                size="card"
                isDecorative
                className="w-full"
              />
            }
          />
        </div>
        {/* Step 2: the words, in the board's order, 12 px apart. */}
        <div className="flex min-w-0 flex-col gap-3">
          <StoryBreadcrumb title={story.title} categorySlug={story.categorySlug} />
          <MetaLine facts={storyLabelFacts(story, t)} />
          <StoryTitleBlock story={story} />
          <StoryStats story={story} />
          <RankBadges slug={story.slug} />
          {story.blurb !== '' && (
            <p lang={story.languageCode} className="m-0 type-long text-ink">
              {story.blurb}
            </p>
          )}
          <StoryLanguageNote story={story} />
          <StoryTagLinks tags={story.tags} />
          <StoryActions story={story} />
        </div>
      </header>
    </Hero>
  );
}
