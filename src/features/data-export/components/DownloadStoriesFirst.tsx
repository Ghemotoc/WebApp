/**
 * DownloadStoriesFirst: "Download stories first" inside the Delete your account panel
 * (bundle IDEAS-2, part a; idea IDEA-20261101-2).
 *
 * A writer leaving in a hurry can save every story before deleting the account, without leaving
 * the panel: "Download stories first" makes the same files as Download my stories' defaults
 * (all stories, chapters and plans, as Word files), shows "We're making your files…" and then
 * "Your files are ready" with Download. The delete step stays open with everything as it was.
 * Someone with no stories sees nothing.
 * Who shows it: DeleteAccountConfirm (features/account-deletion). What it calls: useMyStories
 * (features/writing), the Download my stories hooks and StoriesExportReady.
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { useMyStories } from '@/features/writing/hooks/useMyStories';

import type { StoriesExportChoices } from '../api/dataExport';
import {
  useLatestStoriesExport,
  useStartStoriesExport,
  useStoriesExportRun,
} from '../hooks/useStoriesExport';
import { useDataExportTranslation } from '../registerDataExportTranslations';

import { StoriesExportReady } from './StoriesExportReady';

/** Download my stories' defaults: every story, its chapters and its plan, as Word files. */
const everyStory: StoriesExportChoices = {
  storyId: null,
  chapterIds: null,
  includeChapters: true,
  includePlan: true,
  includeData: false,
  documentFormat: 'word',
};

/** The line under the button: making, failed, or the files of every story once ready. */
function FirstDownloadStatus({ hasAsked, wasReused }: { hasAsked: boolean; wasReused: boolean }) {
  const { t } = useDataExportTranslation();
  const run = useStoriesExportRun();
  const latest = useLatestStoriesExport();
  if (run.phase === 'running') {
    return (
      <p role="status" className="m-0 text-[15px] text-body">
        {t('stories.preparing')}
      </p>
    );
  }
  if (run.phase === 'failed') return <Notice tone="error">{t('stories.failed')}</Notice>;
  // Only a copy of every story counts here, and only once asked, so an older copy of one story
  // isn't offered as "your stories".
  const copy = latest.data ?? null;
  if (!hasAsked || copy === null || copy.story_id !== null) return null;
  return <StoriesExportReady copy={copy} story={null} wasReused={wasReused} />;
}

/**
 * Renders the step, or nothing for someone without stories.
 *
 * @returns the step
 */
export function DownloadStoriesFirst() {
  const { t } = useDataExportTranslation();
  const { stories } = useMyStories();
  const { start } = useStartStoriesExport();
  const isRunning = useStoriesExportRun().phase === 'running';
  const [hasAsked, setHasAsked] = useState(false);
  const [wasReused, setWasReused] = useState(false);
  // Step 1: deleted stories don't count; with none left there is nothing to save.
  const hasStories = stories.some((story) => story.deletedAt === null);
  if (!hasStories) return null;

  /** Step 2: makes every story's files, or finds the unchanged ones from the last 24 hours. */
  async function downloadFirst() {
    setHasAsked(true);
    setWasReused(false);
    const outcome = await start(everyStory);
    setWasReused(outcome === 'reused');
  }

  return (
    <section
      aria-labelledby="download-stories-first-heading"
      className="flex flex-col gap-2 rounded-2xl bg-tint px-4.5 py-4"
    >
      <h4
        id="download-stories-first-heading"
        className="m-0 text-[15px] font-semibold text-heading"
      >
        {t('first.heading')}
      </h4>
      <p className="m-0 text-[15px] text-body">{t('first.body')}</p>
      <Button
        variant="secondary"
        className="w-fit"
        disabled={isRunning}
        onClick={() => void downloadFirst()}
      >
        {t('first.button')}
      </Button>
      <div aria-live="polite">
        <FirstDownloadStatus hasAsked={hasAsked} wasReused={wasReused} />
      </div>
    </section>
  );
}
