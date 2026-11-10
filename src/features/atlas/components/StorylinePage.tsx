/**
 * StorylinePage: /plan/s/:storySlug/storyline, a story's structure in Story Atlas (stories
 * S1-E17-19 to S1-E17-22).
 *
 * The Story Atlas top bar, the heading, then the view switch (Board, Timeline or POV lanes, one
 * switch away, S1-E17-22) with the view's hint beside it, and the view chosen (bundle G10 ATLAS,
 * part c1; board AtlasStoryline). The choice is remembered on this device, so the
 * storyline opens on it next time. Only the writer sees any of it.
 * Who calls it: src/app/router.tsx (loaded only when a writer opens it). What it calls:
 * useStoryline → story_storyline() and the changers; AddActForm, ChapterBoard, TimelineView,
 * PovLanesView;
 * lib/storylineView.ts ("?view=timeline" from a search result wins over it); useMyStories for
 * the top bar.
 */
import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
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

import { AddActForm } from './AddActForm';
import { AtlasPageHeading } from './AtlasPageHeading';
import { AtlasTopBar } from './AtlasTopBar';
import { ChapterBoard } from './ChapterBoard';
import { PovLanesView } from './PovLanesView';
import { TimelineView } from './TimelineView';

/** The view chosen, in a section named after it ("Chapter board", "Timeline" …). */
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
  return (
    <section aria-label={t(`storyline.${view}.heading`)} className="flex min-w-0 flex-col gap-4">
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

/**
 * Board, Timeline or POV lanes (S1-E17-22), with the view's hint beside the switch and, after the
 * hint, the view's own action (the board's "Add act", GAPS-2a).
 */
function ViewToggle({
  slug,
  view,
  onChange,
}: {
  slug: string;
  view: StorylineView;
  onChange: (view: StorylineView) => void;
}) {
  const { t } = useAtlasTranslation();
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <SegmentedControl
        legend={t('storyline.viewLabel')}
        isLegendVisible={false}
        name="atlas-storyline-view"
        options={storylineViews.map((option) => ({
          value: option,
          label: t(`storyline.views.${option}`),
        }))}
        value={view}
        onChange={onChange}
      />
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <p className="m-0 max-w-[60ch] text-sm text-meta">{t(`storyline.${view}.hint`)}</p>
        {view === 'board' && <AddActForm slug={slug} />}
      </div>
    </div>
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
  // "?view=timeline" (from a search result for an event) wins over the remembered view.
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<StorylineView>(
    () =>
      storylineViews.find((option) => option === searchParams.get('view')) ?? readStorylineView(),
  );

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
          <AtlasPageHeading title={t('storyline.heading')} />
          <ViewToggle
            slug={storySlug}
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
