/**
 * IdeasPage: /plan/s/:storySlug/ideas, a story's questions and ideas in Story Atlas (stories
 * S1-E17-27 and S1-E17-28).
 *
 * The Story Atlas top bar, the heading, the quick-add card, then the notes, newest first, in a
 * glass list under the Open, Done and All switch (each with its count; board AtlasIdeas, G10c3). Ticked notes keep their "Action or
 * outcome", so Done reads as a log of decisions. Only the writer sees any of it.
 * Who calls it: src/app/router.tsx (loaded only when a writer opens it). What it calls:
 * useStoryIdeas → story_ideas() and the changers; IdeaQuickAdd and IdeaItem; lib/ideaFilters.ts;
 * useScrollToHash for a note opened from a search result; useMyStories for the top bar.
 */
import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
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
import { AtlasTopBar } from './AtlasTopBar';
import { IdeaItem } from './IdeaItem';
import { IdeaQuickAdd } from './IdeaQuickAdd';

/** The filter, then the notes it shows, or a plain line when there are none. */
function IdeaList({ slug, ideas }: { slug: string; ideas: StoryIdeas }) {
  const { t } = useAtlasTranslation();
  const { save, remove } = useStoryIdeas(slug);
  // "?show=all" (from a search result or a mention) opens on All, so a ticked note is there too.
  const [searchParams] = useSearchParams();
  const [filter, setFilter] = useState<IdeaFilter>(
    searchParams.get('show') === 'all' ? 'all' : 'open',
  );
  const shown = filterIdeas(ideas.items, filter);
  // "#atlas-idea-<id>" brings that note into view once the list is drawn.
  useScrollToHash(true);
  return (
    <section aria-labelledby="atlas-ideas-list-heading" className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="atlas-ideas-list-heading"
          className="m-0 font-heading text-[22px] font-bold text-heading"
        >
          {t('ideas.listHeading')}
        </h2>
        <SegmentedControl
          legend={t('ideas.filterLabel')}
          isLegendVisible={false}
          name="atlas-ideas-filter"
          options={ideaFilters.map((option) => ({
            value: option,
            label: t(`ideas.filters.${option}`, {
              count: filterIdeas(ideas.items, option).length,
            }),
          }))}
          value={filter}
          onChange={setFilter}
        />
      </div>
      {shown.length === 0 && <p className="m-0 text-sm text-meta">{t(`ideas.empty.${filter}`)}</p>}
      {shown.length > 0 && (
        <ul
          aria-labelledby="atlas-ideas-list-heading"
          className="m-0 flex list-none flex-col overflow-hidden rounded-card border border-border bg-surface p-0 shadow-card"
        >
          {shown.map((idea) => (
            <IdeaItem
              key={idea.id}
              idea={idea}
              save={async (change) => save(idea.id, change)}
              remove={async () => remove(idea.id)}
            />
          ))}
        </ul>
      )}
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
    <PageContainer className="tmc-rise flex flex-col gap-8 pt-10 pb-12">
      <title>
        {ideas ? t('ideas.documentTitle', { title: ideas.storyTitle }) : t('homeDocumentTitle')}
      </title>
      {userId !== null && (
        <AtlasTopBar slug={storySlug} writeAddress={writeAddressFor(story)} section="ideas" />
      )}
      {userId === null && <p className="m-0 text-body">{t('signedOut')}</p>}
      {loadFailed && <Notice tone="error">{t('loadFailed')}</Notice>}
      {ideas === null && <Notice tone="error">{t('notFound')}</Notice>}
      {ideas !== undefined && ideas !== null && (
        <>
          <AtlasPageHeading title={t('ideas.heading')} />
          <IdeaQuickAdd onAdd={add} />
          <IdeaList slug={storySlug} ideas={ideas} />
        </>
      )}
    </PageContainer>
  );
}
