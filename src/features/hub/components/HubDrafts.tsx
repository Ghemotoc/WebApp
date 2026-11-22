/**
 * HubDrafts: "Drafts" on the Home page (bundle CALM-7c; board New-Home: rows of a small cover, the
 * title and a meta line such as "**Draft** · Chapter 8 · edited 2 hours ago", with "Write" at the
 * top right).
 *
 * The first row is the chapter the writer saved last (my_discover_cards()), opening the editor.
 * Then up to two more of the writer's own stories, each with its state first in bold
 * (Scheduled, Draft for a story not yet out, else who can read it) and its chapters. A writer
 * with no stories gets one line pointing to Write.
 * Who shows it: WritersHubPage. What it calls: useDiscoverCards, useMyStories, liveOwnStories,
 * DrawnCover, StoryCoverArt and MetaLine.
 */
import { Link } from 'react-router';

import { automaticCoverFor, designsForRow } from '@/components/covers/automaticCover';
import type { DrawnCoverChoice } from '@/components/covers/coverDesigns';
import { DrawnCover } from '@/components/covers/DrawnCover';
import { buttonClassName } from '@/components/ui/buttonStyles';
import { MetaLine, type MetaFact } from '@/components/ui/MetaLine';
import { Notice } from '@/components/ui/Notice';
import { timeAgo } from '@/features/comments/lib/timeAgo';
import type { DraftCardData } from '@/features/discovery/api/discoverCards';
import { useDiscoverCards } from '@/features/discovery/hooks/useDiscoverCards';
import { liveOwnStories } from '@/features/library/lib/ownStories';
import { StoryCoverArt } from '@/features/pictures/components/StoryCoverArt';
import type { MyStory } from '@/features/writing/api/stories';
import { useMyStories } from '@/features/writing/hooks/useMyStories';

import { useHubTranslation } from '../registerHubTranslations';

/** How many rows the section shows (board New-Home: three). */
const rowLimit = 3;

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
 * One row: the small cover, the title as the link and the meta line.
 *
 * @returns the list item
 */
function DraftRow(props: {
  story: MyStory;
  cover: DrawnCoverChoice;
  href: string;
  facts: MetaFact[];
}) {
  const { story, cover, href, facts } = props;
  const drawn = (
    <DrawnCover title={story.title} choice={cover} size="tile" isDecorative className="w-14" />
  );
  return (
    <li className="flex items-start gap-4 border-b border-hairline py-3 last:border-b-0">
      <StoryCoverArt story={story} drawn={drawn} className="w-14 shrink-0" />
      <div className="flex min-w-0 flex-col gap-1">
        <Link
          to={href}
          className="font-semibold break-words text-heading no-underline hover:underline"
        >
          {story.title}
        </Link>
        <MetaLine facts={facts} />
      </div>
    </li>
  );
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
 * Renders the section.
 *
 * @returns the section, a plain message when the stories can't be read, or nothing while loading
 */
export function HubDrafts() {
  const { t, i18n } = useHubTranslation();
  const { stories, isKnown, loadFailed } = useMyStories();
  const { cards } = useDiscoverCards();
  const draft = cards?.draft ?? null;
  if (loadFailed) return <Notice tone="error">{t('hub.drafts.loadFailed')}</Notice>;
  if (!isKnown) return null;
  // Step 1: the rows, with covers worked out per list so neighbours never share a design.
  const shown = storiesInOrder(liveOwnStories(stories), draft);
  const covers = designsForRow(shown);
  return (
    <section aria-labelledby="hub-drafts" className="flex flex-col">
      <div className="mb-2 flex items-center justify-between gap-4">
        <h2 id="hub-drafts" className="m-0 type-heading">
          {t('hub.drafts.heading')}
        </h2>
        <Link to="/write" className={buttonClassName({ variant: 'text' })}>
          {t('hub.drafts.write')}
        </Link>
      </div>
      {shown.length === 0 && <p className="m-0 text-body">{t('hub.drafts.none')}</p>}
      <ul className="m-0 list-none p-0">
        {/* Step 2: the latest draft opens the editor; the other stories open their chapters. */}
        {shown.map((story, index) => {
          const isLatest = draft !== null && story.slug === draft.storySlug;
          const slug = encodeURIComponent(story.slug);
          return (
            <DraftRow
              key={story.slug}
              story={story}
              cover={covers[index] ?? automaticCoverFor(story.id)}
              href={
                isLatest ? `/write/s/${slug}/c/${draft.chapterCode}` : `/write/s/${slug}/chapters`
              }
              facts={isLatest ? draftFacts(draft, t, i18n.language) : storyFacts(story, t)}
            />
          );
        })}
      </ul>
    </section>
  );
}
