/**
 * StoryHeader: the story page's hero (story S1-E3-05; since bundle CALM-7c, board New-Story and
 * the simplified design handover, Step 3, "Story page").
 *
 * The page's one glass hero (Hero): the 240 px cover on the left (the rank badges under it,
 * CMS-1g) and, on the right, in the board's order:
 *   - the meta line "Fiction · Ongoing · No AI · 13+" (lib/storyLabelFacts.ts; it replaces the
 *     pill row and StoryLabelPills here, retired in CALM-9c), with the ranking place after it (S1-E15-05);
 *   - the title in the display style, with the "Read in" switch beside it (TRANSLATE-1b), then
 *     "by <name>" as a link to the profile and, for a translated classic, who translated it;
 *   - the numbers as a second meta line (StoryStats, S1-E5-03);
 *   - the blurb, the note on which language is shown (StoryLanguageNote), the tags as text links
 *     to their tag pages (S1-E5-01);
 *   - "Start reading" or "Continue chapter n" (main) and the Library drop-down
 *     (StoryReadingActions, S1-E4-03), Follow (S1-E6-05) and Share (IDEAS-1c), and the line on
 *     what following does.
 * The board's story-level Like is left out: likes are per chapter (handover, On hold). The content
 * note moved to "Labels from the writer" (StoryLabels), where the board has it.
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
import { StoryReadingActions } from '@/features/library/components/StoryReadingActions';
import { FollowButton } from '@/features/people/components/FollowButton';
import { StoryShareButton } from '@/features/sharing/components/StoryShareButton';
import type { SharedStory } from '@/features/sharing/lib/sharedStory';
import { RankBadges } from '@/features/tags/components/RankBadges';
import { useTagCatalogue } from '@/features/tags/hooks/useTagCatalogue';

import type { StoryPageData } from '../api/storyPage';

import { ReadInSwitch } from './ReadInSwitch';
import { StoryLanguageNote, TranslationCredit } from './StoryLanguageNote';
import { storyLabelFacts } from '../lib/storyLabelFacts';

import { RankingPlacePill } from './RankingPlacePill';
import { StoryStats } from './StoryStats';

/**
 * The story's tags as plain text links, each to the page of stories with that tag (S1-E5-01;
 * board New-Story: links 16 px apart, 15 px, in the ink colour).
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
            className="hit-target inline-flex min-h-6 items-center type-body text-ink underline-offset-2 hover:underline"
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
 * The hero's first meta line ("Fiction · Ongoing · No AI · 13+", CALM-7c; it replaces the pill
 * row), with the ranking place (S1-E15-05, "#3 in Fantasy") after it when the story has one.
 *
 * @returns the line
 */
function StoryLabelLine({ story }: { story: StoryPageData }) {
  const { t } = useTranslation('reading');
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <MetaLine facts={storyLabelFacts(story, t)} />
      <RankingPlacePill storySlug={story.slug} />
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
  const { t } = useTranslation('reading');
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
      {/* Board New-Story: what following does, under the buttons. */}
      {story.isPublic && !story.isOwner && (
        <p className="m-0 type-meta leading-[18px] text-ink-muted">{t('storyPage.followNote')}</p>
      )}
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
  const cover = resolveCoverChoice(story);
  return (
    <Hero labelledBy="story-title">
      <header className="grid items-start gap-8 min-[900px]:grid-cols-[240px_minmax(0,1fr)] min-[900px]:gap-12">
        {/* Step 1: the cover, with the story's ranks in its tags under it (CMS-1g). */}
        <div className="flex w-[240px] max-w-full flex-col gap-3">
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
          <RankBadges slug={story.slug} />
        </div>
        {/* Step 2: the words, in the board's order. */}
        <div className="flex min-w-0 flex-col gap-4">
          <StoryLabelLine story={story} />
          <StoryTitleBlock story={story} />
          <StoryStats story={story} />
          {story.blurb !== '' && (
            <p lang={story.languageCode} className="m-0 max-w-[62ch] type-long text-ink-muted">
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
