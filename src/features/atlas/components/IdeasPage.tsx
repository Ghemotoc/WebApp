/**
 * IdeasPage: /plan/s/:storySlug/ideas, a story's questions and ideas in Story Atlas (stories
 * S1-E17-27 and S1-E17-28; redrawn by user stories bundle 6, story 6.12, board E31).
 *
 * The Story Atlas top bar and the heading, then two sections between hairlines, 32 px apart (the
 * spacing scale's step for board E31's 40): "Jot it down" and "Notes". Notes has the Show switch,
 * Open, Done or Both with each count (Both first, as the board presses it), then the notes, newest
 * first, as plain rows. Ticked notes keep their "Action or outcome", so Done reads as a log of
 * decisions. Only the writer sees any of it.
 * Who calls it: src/app/router.tsx (loaded only when a writer opens it). What it calls:
 * useStoryIdeas → story_ideas() and the changers; IdeaQuickAdd and IdeaItem; lib/ideaFilters.ts;
 * useScrollToHash for a note opened from a search result; useMyStories for the top bar.
 */
import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useSession } from '@/features/auth/hooks/useSession';
import { useMyStories } from '@/features/writing/hooks/useMyStories';

import type { StoryIdeas } from '../api/ideas';
import { useScrollToHash } from '../hooks/useScrollToHash';
import { useStoryIdeas } from '../hooks/useStoryIdeas';
import { filterIdeas, ideaFilters, type IdeaFilter } from '../lib/ideaFilters';
import { writeAddressFor } from '../lib/writeAddress';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { AtlasPageHeading } from './AtlasPageHeading';
import { AtlasFrame } from './AtlasFrame';
import { IdeaItem } from './IdeaItem';
import { IdeaQuickAdd } from './IdeaQuickAdd';

/** The list's id, so the focus can land on it once a note is deleted. */
const listId = 'atlas-ideas-list';

/** The filter a link asks for ("?show=open"), or Both, as board E31 opens. */
function useStartingFilter(): IdeaFilter {
  const [searchParams] = useSearchParams();
  const asked = ideaFilters.find((option) => option === searchParams.get('show'));
  return asked ?? 'all';
}

/** The Show switch, then the notes it shows, or a plain line when there are none. */
function IdeaList({ slug, ideas }: { slug: string; ideas: StoryIdeas }) {
  const { t } = useAtlasTranslation();
  const { save, remove, putBack } = useStoryIdeas(slug);
  const [filter, setFilter] = useState<IdeaFilter>(useStartingFilter());
  const shown = filterIdeas(ideas.items, filter);
  // "#atlas-idea-<id>" brings that note into view once the list is drawn.
  useScrollToHash(true);
  return (
    <section
      aria-labelledby="atlas-ideas-list-heading"
      className="flex min-w-0 flex-col gap-4 border-t border-hairline pt-6"
    >
      <h2
        id="atlas-ideas-list-heading"
        className="m-0 font-heading type-heading font-bold text-ink-heading"
      >
        {t('ideas.listHeading')}
      </h2>
      <div className="flex min-w-0 flex-col gap-3">
        <SegmentedControl
          legend={t('ideas.filterLabel')}
          isLegendVisible={false}
          name="atlas-ideas-filter"
          columns={3}
          options={ideaFilters.map((option) => ({
            value: option,
            label: t(`ideas.filters.${option}`, {
              count: filterIdeas(ideas.items, option).length,
            }),
          }))}
          value={filter}
          onChange={setFilter}
        />
        {shown.length === 0 && (
          <p className="m-0 type-body text-ink-muted">{t(`ideas.empty.${filter}`)}</p>
        )}
        {/* The list takes the focus once a note is deleted, so it never falls to the page. */}
        <ul
          id={listId}
          tabIndex={-1}
          aria-label={t('ideas.heading')}
          className="m-0 flex list-none flex-col p-0 outline-none"
        >
          {shown.map((idea) => (
            <IdeaItem
              key={idea.id}
              idea={idea}
              save={async (change) => save(idea.id, change)}
              remove={async () => remove(idea.id)}
              putBack={putBack}
              onRemoved={() => document.getElementById(listId)?.focus()}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * Renders the page.
 *
 * @returns the Ideas page, a wait or a plain message
 */
export function IdeasPage() {
  const { t } = useAtlasTranslation();
  const { storySlug = '' } = useParams();
  const { userId, isKnown } = useSession();
  const { ideas, loadFailed, add } = useStoryIdeas(storySlug);
  const { stories } = useMyStories();
  const story = stories.find((candidate) => candidate.slug === storySlug);

  if (!isKnown) return null;
  return (
    <AtlasFrame
      slug={storySlug}
      writeAddress={writeAddressFor(story)}
      section="ideas"
      showsChrome={userId !== null}
    >
      <title>
        {ideas ? t('ideas.documentTitle', { title: ideas.storyTitle }) : t('homeDocumentTitle')}
      </title>
      {userId === null && <p className="m-0 text-ink-muted">{t('signedOut')}</p>}
      {loadFailed && <Notice tone="error">{t('loadFailed')}</Notice>}
      {ideas === null && <Notice tone="error">{t('notFound')}</Notice>}
      {ideas !== undefined && ideas !== null && (
        <>
          <AtlasPageHeading title={t('ideas.heading')} />
          <div className="flex min-w-0 flex-col gap-8">
            <IdeaQuickAdd onAdd={add} />
            <IdeaList slug={storySlug} ideas={ideas} />
          </div>
        </>
      )}
    </AtlasFrame>
  );
}
