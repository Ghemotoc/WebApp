/**
 * HubDrafts: "Drafts" on the Home page (bundle CALM-7c; since user story 1.1 board A01: a row of
 * covers, each with the title and a line such as "Draft · Chapter 8 · edited 2 hours ago", with
 * "Write" at the top right).
 *
 * The first cover is the story with the chapter the writer saved last (my_discover_cards()),
 * opening the editor. Then the writer's other stories, each with its state first (Scheduled,
 * Draft for a story not yet out, else who can read it) and its chapters. A writer with no
 * stories gets one line pointing to Write.
 * Who shows it: MemberHomePage. What it calls: useDiscoverCards, useMyStories, liveOwnStories,
 * Shelf, StoryCard and StoryCoverArt.
 */
import { Link } from 'react-router';

import { automaticCoverFor, designsForRow } from '@/components/covers/automaticCover';
import { buttonClassName } from '@/components/ui/buttonStyles';
import type { MetaFact } from '@/components/ui/MetaLine';
import { Notice } from '@/components/ui/Notice';
import { Shelf } from '@/components/ui/Shelf';
import { StoryCard } from '@/components/ui/StoryCard';
import { timeAgo } from '@/features/comments/lib/timeAgo';
import type { DraftCardData } from '@/features/discovery/api/discoverCards';
import { useDiscoverCards } from '@/features/discovery/hooks/useDiscoverCards';
import { liveOwnStories } from '@/features/library/lib/ownStories';
import { StoryCoverArt } from '@/features/pictures/components/StoryCoverArt';
import type { MyStory } from '@/features/writing/api/stories';
import { useMyStories } from '@/features/writing/hooks/useMyStories';

import { useHubTranslation } from '../registerHubTranslations';

/** How many covers the row shows (board A01 draws three; a writer may have up to 20). */
const rowLimit = 20;

type Translate = ReturnType<typeof useHubTranslation>['t'];

/**
 * A story's facts: its state in bold, then how many chapters it has.
 *
 * @param story - the writer's story
 * @param t - the hub namespace's translate function
 * @returns the facts
 */
function storyFacts(story: MyStory, t: Translate): MetaFact[] {
  // Step 1: the state. A scheduled chapter matters most, then a story nobody can read yet.
  const isScheduled = story.chapters.some((chapter) => chapter.status === 'scheduled');
  let state = t(`hub.drafts.${story.visibility}`);
  if (story.firstPublishedAt === null) state = t('hub.drafts.draft');
  if (isScheduled) state = t('hub.drafts.scheduled');
  // Step 2: the chapters it holds.
  return [
    { text: state, kind: 'state' },
    { text: t('hub.drafts.chapters', { count: story.chapters.length }) },
  ];
}

/**
 * The latest draft's facts: "Draft · Chapter 8 · edited 2 hours ago".
 *
 * @param draft - the chapter saved last
 * @param t - the hub namespace's translate function
 * @param language - the interface language, for the time
 * @returns the facts
 */
function draftFacts(draft: DraftCardData, t: Translate, language: string): MetaFact[] {
  return [
    { text: t('hub.drafts.draft'), kind: 'state' },
    { text: t('hub.drafts.chapter', { number: draft.number }) },
    { text: t('hub.drafts.editedWhen', { when: timeAgo(draft.savedAt, language) }) },
  ];
}

/**
 * The facts as the one line under a cover ("Draft · Chapter 8 · edited 2 hours ago").
 *
 * @param facts - the facts, the state first
 * @returns the line
 */
function factsLine(facts: MetaFact[]): string {
  return facts.map((fact) => fact.text).join(' · ');
}

/**
 * Puts the story with the latest draft first, then the others, at most three.
 *
 * @param stories - the writer's live stories
 * @param draft - the chapter saved last, or null
 * @returns the stories to show, in order
 */
function storiesInOrder(stories: MyStory[], draft: DraftCardData | null): MyStory[] {
  if (draft === null) return stories.slice(0, rowLimit);
  const latest = stories.filter((story) => story.slug === draft.storySlug);
  const others = stories.filter((story) => story.slug !== draft.storySlug);
  return [...latest, ...others].slice(0, rowLimit);
}

/**
 * Renders the row.
 *
 * @returns the row, one line pointing to Write when there is no story, a plain message when the
 *   stories can't be read, or nothing while loading
 */
export function HubDrafts() {
  const { t, i18n } = useHubTranslation();
  const { stories, isKnown, loadFailed } = useMyStories();
  const { cards } = useDiscoverCards();
  const draft = cards?.draft ?? null;
  if (loadFailed) return <Notice tone="error">{t('hub.drafts.loadFailed')}</Notice>;
  if (!isKnown) return null;
  // Step 1: the stories, with covers worked out per row so neighbours never share a design.
  const shown = storiesInOrder(liveOwnStories(stories), draft);
  const covers = designsForRow(shown);
  const writeLink = (
    <Link to="/write" className={buttonClassName({ variant: 'text' })}>
      {t('hub.drafts.write')}
    </Link>
  );
  // Step 2: no story yet, so one line points to Write.
  if (shown.length === 0) {
    return (
      <section aria-labelledby="hub-drafts" className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <h2 id="hub-drafts" className="m-0 type-heading">
            {t('hub.drafts.heading')}
          </h2>
          {writeLink}
        </div>
        <p className="m-0 text-ink-muted">{t('hub.drafts.none')}</p>
      </section>
    );
  }
  // Step 3: one cover each; the latest draft opens the editor, the others open their chapters.
  const items = shown.map((story, index) => {
    const isLatest = draft !== null && story.slug === draft.storySlug;
    const slug = encodeURIComponent(story.slug);
    const facts = isLatest ? draftFacts(draft, t, i18n.language) : storyFacts(story, t);
    return {
      key: story.slug,
      content: (
        <StoryCard
          title={story.title}
          metaLine={factsLine(facts)}
          cover={covers[index] ?? automaticCoverFor(story.id)}
          href={isLatest ? `/write/s/${slug}/c/${draft.chapterCode}` : `/write/s/${slug}/chapters`}
          wrapCover={(drawn) => <StoryCoverArt story={story} drawn={drawn} className="w-full" />}
        />
      ),
    };
  });
  return <Shelf title={t('hub.drafts.heading')} items={items} headerAction={writeLink} />;
}
