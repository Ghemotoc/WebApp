/**
 * IdeasPage: /plan/s/:storySlug/ideas, a story's questions and ideas in Story Atlas (stories
 * S1-E17-27 and S1-E17-28).
 *
 * The Story Atlas top bar, the heading, the quick-add box, then the notes, newest first, with
 * the Open, Done and All filter (each with its count). Ticked notes keep their "Action or
 * outcome", so Done reads as a log of decisions. Only the writer sees any of it.
 * Who calls it: src/app/router.tsx (loaded only when a writer opens it). What it calls:
 * useStoryIdeas → story_ideas() and the changers; IdeaQuickAdd and IdeaItem; lib/ideaFilters.ts;
 * useMyStories for the top bar.
 */
import { useState } from 'react';
import { useParams } from 'react-router';

import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { useSession } from '@/features/auth/hooks/useSession';
import { useMyStories } from '@/features/writing/hooks/useMyStories';

import type { StoryIdeas } from '../api/ideas';
import { useStoryIdeas } from '../hooks/useStoryIdeas';
import { filterIdeas, ideaFilters, type IdeaFilter } from '../lib/ideaFilters';
import { writeAddressFor } from '../lib/writeAddress';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { AtlasTopBar } from './AtlasTopBar';
import { IdeaItem } from './IdeaItem';
import { IdeaQuickAdd } from './IdeaQuickAdd';

/** The filter, then the notes it shows, or a plain line when there are none. */
function IdeaList({ slug, ideas }: { slug: string; ideas: StoryIdeas }) {
  const { t } = useAtlasTranslation();
  const { save, remove } = useStoryIdeas(slug);
  const [filter, setFilter] = useState<IdeaFilter>('open');
  const shown = filterIdeas(ideas.items, filter);
  return (
    <section
      aria-labelledby="atlas-ideas-list-heading"
      className="flex min-w-0 flex-col gap-4 rounded-card border border-border bg-surface px-5 py-5 shadow-card md:px-7"
    >
      <h2
        id="atlas-ideas-list-heading"
        className="m-0 font-heading text-[22px] font-bold text-heading"
      >
        {t('ideas.listHeading')}
      </h2>
      <ChoiceChips
        label={t('ideas.filterLabel')}
        isLabelVisible
        isLabelEyebrow
        options={ideaFilters.map((option) => ({
          value: option,
          label: t(`ideas.filters.${option}`, {
            count: filterIdeas(ideas.items, option).length,
          }),
        }))}
        value={filter}
        onChange={(chosen) => setFilter(ideaFilters.find((option) => option === chosen) ?? 'open')}
      />
      {shown.length === 0 && <p className="m-0 text-sm text-meta">{t(`ideas.empty.${filter}`)}</p>}
      {shown.length > 0 && (
        <ul aria-labelledby="atlas-ideas-list-heading" className="m-0 list-none p-0">
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
          <header className="flex flex-col gap-2">
            <h1 className="m-0 text-[clamp(36px,4.4vw,56px)] leading-[0.98] font-extrabold tracking-[-0.025em] break-words">
              {t('ideas.heading')}
            </h1>
            <p className="m-0 text-sm text-meta">
              {ideas.storyTitle} · {t('privateNote')}
            </p>
          </header>
          <IdeaQuickAdd onAdd={add} />
          <IdeaList slug={storySlug} ideas={ideas} />
        </>
      )}
    </PageContainer>
  );
}
