/**
 * DownloadMyStoriesBlock: "Download my stories" at the foot of Settings › Download my data (story
 * S1-E13-05; board Settings 6.3, the Download my data tab).
 *
 * Top to bottom as on the board: the heading and intro, the Story drop-down (all my stories, or
 * one, drafts marked) with "Get Word files", and the line about the notification and the seven
 * days. Below it: "We're making your Word files…" while they are made, the ready line once they
 * are, or a plain line after a failure. A writer without stories sees one line instead of the
 * drop-down. It has id "download-my-stories", so the "ready" notification opens it.
 * Who shows it: DownloadMyDataSection. What it calls: useMyStories (features/writing) and the
 * hooks in ../hooks/useStoriesExport.ts.
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Select } from '@/components/ui/Select';
import { useMyStories } from '@/features/writing/hooks/useMyStories';

import {
  useLatestStoriesExport,
  useStartStoriesExport,
  useStoriesExportRun,
} from '../hooks/useStoriesExport';
import { useDataExportTranslation } from '../registerDataExportTranslations';

import { StoriesExportReady } from './StoriesExportReady';

/** The value of "All my stories" in the drop-down. */
const ALL_STORIES = 'all';

/** A story the writer still has, as the block needs it. */
interface LiveStory {
  id: string;
  slug: string;
  title: string;
  isDraft: boolean;
}

/** The writer's stories that aren't deleted, newest first as Settings lists them elsewhere. */
function useLiveStories(): { stories: LiveStory[]; isKnown: boolean; loadFailed: boolean } {
  const { stories, isKnown, loadFailed } = useMyStories();
  const live = stories
    .filter((story) => story.deletedAt === null)
    .map((story) => ({
      id: story.id,
      slug: story.slug,
      title: story.title,
      isDraft: story.firstPublishedAt === null,
    }));
  return { stories: live, isKnown, loadFailed };
}

/** The drop-down and "Get Word files". */
function StoryPicker({
  stories,
  onGet,
}: {
  stories: LiveStory[];
  onGet: (choice: string) => void;
}) {
  const { t } = useDataExportTranslation();
  const [choice, setChoice] = useState(ALL_STORIES);
  const isRunning = useStoriesExportRun().phase === 'running';
  const options = [
    { value: ALL_STORIES, label: t('stories.allOption', { count: stories.length }) },
    ...stories.map((story) => ({
      value: story.id,
      label: story.isDraft ? t('stories.draftOption', { title: story.title }) : story.title,
    })),
  ];
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-2">
        {/* The board's eyebrow label; the drop-down carries the same name for screen readers. */}
        <span aria-hidden="true" className="font-eyebrow text-sm leading-[1.3] text-eyebrow">
          {t('stories.storyLabel')}
        </span>
        <Select
          id="download-story"
          label={t('stories.storyLabel')}
          options={options}
          value={choice}
          onChange={setChoice}
        />
      </div>
      <Button size="lg" disabled={isRunning} onClick={() => onGet(choice)}>
        {t('stories.get')}
      </Button>
    </div>
  );
}

/** The line under the controls: making, ready, failed or nothing yet. */
function StoriesStatus({ stories, wasReused }: { stories: LiveStory[]; wasReused: boolean }) {
  const { t } = useDataExportTranslation();
  const latest = useLatestStoriesExport();
  const run = useStoriesExportRun();
  if (run.phase === 'running') {
    return (
      <p role="status" className="m-0 rounded-2xl bg-tint px-4.5 py-4 text-[15px] text-body">
        {t('stories.preparing')}
      </p>
    );
  }
  if (run.phase === 'failed') return <Notice tone="error">{t('stories.failed')}</Notice>;
  if (latest.isError) return <Notice tone="error">{t('settings.loadFailed')}</Notice>;
  const copy = latest.data ?? null;
  if (copy === null) return null;
  const story = stories.find((candidate) => candidate.id === copy.story_id) ?? null;
  return <StoriesExportReady copy={copy} story={story} wasReused={wasReused} />;
}

/**
 * Renders the block.
 *
 * @returns the block
 */
export function DownloadMyStoriesBlock() {
  const { t } = useDataExportTranslation();
  const { stories, isKnown, loadFailed } = useLiveStories();
  const { start } = useStartStoriesExport();
  const [wasReused, setWasReused] = useState(false);

  /** Starts the Word files for the choice, and remembers whether the earlier ones came back. */
  async function getWordFiles(choice: string) {
    setWasReused(false);
    const outcome = await start(choice === ALL_STORIES ? null : choice);
    setWasReused(outcome === 'reused');
  }

  return (
    <div
      id="download-my-stories"
      className="flex scroll-mt-24 flex-col gap-3 border-t border-border pt-5.5"
    >
      <h3 className="m-0 font-heading text-xl font-bold text-heading">{t('stories.heading')}</h3>
      <p className="m-0 text-[15px] leading-relaxed text-body">{t('stories.intro')}</p>
      {loadFailed && <Notice tone="error">{t('stories.loadFailed')}</Notice>}
      {isKnown && !loadFailed && stories.length === 0 && (
        <p className="m-0 text-[15px] text-body">{t('stories.none')}</p>
      )}
      {stories.length > 0 && (
        <>
          <StoryPicker stories={stories} onGet={(choice) => void getWordFiles(choice)} />
          <span className="text-sm leading-normal text-meta">{t('stories.hint')}</span>
          <StoriesStatus stories={stories} wasReused={wasReused} />
        </>
      )}
    </div>
  );
}
