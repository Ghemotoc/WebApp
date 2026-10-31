/**
 * StorylinePage: /plan/s/:storySlug/storyline, a story's structure in Story Atlas (stories
 * S1-E17-19 to S1-E17-22).
 *
 * The Story Atlas top bar, the heading, then the view toggle (Board, Timeline or POV lanes, one
 * toggle away, S1-E17-22) and the view chosen. The choice is remembered on this device, so the
 * storyline opens on it next time. Only the writer sees any of it.
 * Who calls it: src/app/router.tsx (loaded only when a writer opens it). What it calls:
 * useStoryline → story_storyline() and the changers; ChapterBoard, TimelineView, PovLanesView;
 * lib/storylineView.ts; useMyStories for the top bar.
 */
import { useState } from 'react';
import { useParams } from 'react-router';

import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { useSession } from '@/features/auth/hooks/useSession';
import { useMyStories } from '@/features/writing/hooks/useMyStories';

import type { Storyline } from '../api/storyline';
import { useChapterLabels } from '../hooks/useChapterLabels';
import { useStoryline } from '../hooks/useStoryline';
import {
  readStorylineView,
  rememberStorylineView,
  storylineViews,
  type StorylineView,
} from '../lib/storylineView';
import { writeAddressFor } from '../lib/writeAddress';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { AtlasTopBar } from './AtlasTopBar';
import { ChapterBoard } from './ChapterBoard';
import { PovLanesView } from './PovLanesView';
import { TimelineView } from './TimelineView';

/** The view's heading and hint, then the view itself. */
function StorylineBody({
  slug,
  storyline,
  view,
}: {
  slug: string;
  storyline: Storyline;
  view: StorylineView;
}) {
  const { t } = useAtlasTranslation();
  const changers = useStoryline(slug);
  const labelOf = useChapterLabels(storyline.chapters);
  const headings = { board: 'board', timeline: 'timeline', lanes: 'lanes' } as const;
  return (
    <section aria-labelledby="atlas-storyline-view-heading" className="flex min-w-0 flex-col gap-4">
      <h2
        id="atlas-storyline-view-heading"
        className="m-0 font-heading text-[22px] font-bold text-heading"
      >
        {t(`storyline.${headings[view]}.heading`)}
      </h2>
      <p className="m-0 text-sm text-meta">{t(`storyline.${headings[view]}.hint`)}</p>
      {view === 'board' && (
        <ChapterBoard
          slug={slug}
          storyline={storyline}
          refresh={changers.refresh}
          addChapter={changers.addChapter}
        />
      )}
      {view === 'timeline' && (
        <TimelineView
          slug={slug}
          storyline={storyline}
          labelOf={labelOf}
          addEvent={changers.addEvent}
          saveEvent={changers.saveEvent}
          removeEvent={changers.removeEvent}
        />
      )}
      {view === 'lanes' && <PovLanesView slug={slug} storyline={storyline} labelOf={labelOf} />}
    </section>
  );
}

/** Board, Timeline or POV lanes (S1-E17-22). */
function ViewToggle({
  view,
  onChange,
}: {
  view: StorylineView;
  onChange: (view: StorylineView) => void;
}) {
  const { t } = useAtlasTranslation();
  return (
    <ChoiceChips
      label={t('storyline.viewLabel')}
      isLabelVisible
      isLabelEyebrow
      options={storylineViews.map((option) => ({
        value: option,
        label: t(`storyline.views.${option}`),
      }))}
      value={view}
      onChange={(chosen) => onChange(storylineViews.find((option) => option === chosen) ?? 'board')}
    />
  );
}

/**
 * Renders the page.
 *
 * @returns the storyline page, a wait or a plain message
 */
export function StorylinePage() {
  const { t } = useAtlasTranslation();
  const { storySlug = '' } = useParams();
  const { userId, isKnown } = useSession();
  const { storyline, loadFailed } = useStoryline(storySlug);
  const { stories } = useMyStories();
  const story = stories.find((candidate) => candidate.slug === storySlug);
  const [view, setView] = useState<StorylineView>(readStorylineView);

  if (!isKnown) return null;
  return (
    <PageContainer className="tmc-rise flex flex-col gap-8 pt-10 pb-12">
      <title>
        {storyline
          ? t('storyline.documentTitle', { title: storyline.storyTitle })
          : t('homeDocumentTitle')}
      </title>
      {userId !== null && (
        <AtlasTopBar slug={storySlug} writeAddress={writeAddressFor(story)} section="storyline" />
      )}
      {userId === null && <p className="m-0 text-body">{t('signedOut')}</p>}
      {loadFailed && <Notice tone="error">{t('loadFailed')}</Notice>}
      {storyline === null && <Notice tone="error">{t('notFound')}</Notice>}
      {storyline !== undefined && storyline !== null && (
        <>
          <header className="flex flex-col gap-2">
            <h1 className="m-0 text-[clamp(36px,4.4vw,56px)] leading-[0.98] font-extrabold tracking-[-0.025em] break-words">
              {t('storyline.heading')}
            </h1>
            <p className="m-0 text-sm text-meta">
              {storyline.storyTitle} · {t('privateNote')}
            </p>
          </header>
          <ViewToggle
            view={view}
            onChange={(chosen) => {
              setView(chosen);
              rememberStorylineView(chosen);
            }}
          />
          <StorylineBody slug={storySlug} storyline={storyline} view={view} />
        </>
      )}
    </PageContainer>
  );
}
