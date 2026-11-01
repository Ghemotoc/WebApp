/**
 * DownloadMyStoriesBlock: "Download my stories" at the foot of Settings › Download my data (story
 * S1-E13-05; board Settings 6.3, the Download my data tab; widened by Robert, 1 Nov 2026, 06:27
 * and 06:29: the plan from Story Atlas, chosen chapters and a JSON copy).
 *
 * Top to bottom: the heading and intro, the Story drop-down (all my stories, or one, drafts
 * marked), "What to include" (the chapters, the plan, the JSON copy), for one story "All
 * chapters" or "Only the chapters I choose", then "Get my files" and the line about the
 * notification and the seven days. Below it: "We're making your files…" while they are made, the
 * ready line once they are, or a plain line after a failure. A writer without stories sees one
 * line instead. It has id "download-my-stories", so the "ready" notification opens it.
 * Who shows it: DownloadMyDataSection. What it calls: useMyStories (features/writing), the hooks
 * in ../hooks/useStoriesExport.ts and ../hooks/useDownloadChoices.ts, and useScrollToHash for
 * the notification's link.
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Select } from '@/components/ui/Select';
import { useScrollToHash } from '@/features/atlas/hooks/useScrollToHash';
import { useMyStories } from '@/features/writing/hooks/useMyStories';

import {
  ALL_STORIES,
  choiceProblem,
  requestChoices,
  useDownloadChoices,
  type ChoiceProblem,
  type DownloadChoices,
} from '../hooks/useDownloadChoices';
import {
  useLatestStoriesExport,
  useStartStoriesExport,
  useStoriesExportRun,
} from '../hooks/useStoriesExport';
import { useDataExportTranslation } from '../registerDataExportTranslations';

import { ChapterChoice } from './ChapterChoice';
import { StoriesExportReady } from './StoriesExportReady';
import { StoriesFileChoices } from './StoriesFileChoices';

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

/** The Story drop-down. */
function StoryPicker({ stories, choices }: { stories: LiveStory[]; choices: DownloadChoices }) {
  const { t } = useDataExportTranslation();
  const options = [
    { value: ALL_STORIES, label: t('stories.allOption', { count: stories.length }) },
    ...stories.map((story) => ({
      value: story.id,
      label: story.isDraft ? t('stories.draftOption', { title: story.title }) : story.title,
    })),
  ];
  return (
    <div className="flex min-w-0 flex-col gap-2">
      {/* The board's eyebrow label; the drop-down carries the same name for screen readers. */}
      <span aria-hidden="true" className="font-eyebrow text-sm leading-[1.3] text-eyebrow">
        {t('stories.storyLabel')}
      </span>
      <Select
        id="download-story"
        label={t('stories.storyLabel')}
        options={options}
        value={choices.story}
        onChange={choices.setStory}
      />
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

/** Every control, "Get my files" and its hint. */
function StoriesForm({ stories }: { stories: LiveStory[] }) {
  const { t } = useDataExportTranslation();
  const choices = useDownloadChoices();
  const { start } = useStartStoriesExport();
  const isRunning = useStoriesExportRun().phase === 'running';
  const [problem, setProblem] = useState<ChoiceProblem>(null);
  const [wasReused, setWasReused] = useState(false);

  /** Checks the choices, then makes the files or finds the earlier ones. */
  async function getFiles() {
    const found = choiceProblem(choices);
    setProblem(found);
    if (found !== null) return;
    setWasReused(false);
    const outcome = await start(requestChoices(choices));
    setWasReused(outcome === 'reused');
  }

  return (
    <>
      <StoryPicker stories={stories} choices={choices} />
      <StoriesFileChoices choices={choices.files} onChange={choices.setFiles} />
      {choices.showsChapterChoice && (
        <ChapterChoice
          storyId={choices.story}
          onlyChosen={choices.onlyChosenChapters}
          chosenIds={choices.chosenChapterIds}
          onModeChange={choices.setOnlyChosenChapters}
          onChosenChange={choices.setChosenChapterIds}
        />
      )}
      <div aria-live="polite">
        {problem !== null && <Notice tone="error">{t(`stories.problems.${problem}`)}</Notice>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" disabled={isRunning} onClick={() => void getFiles()}>
          {t('stories.get')}
        </Button>
      </div>
      <span className="text-sm leading-normal text-meta">{t('stories.hint')}</span>
      <StoriesStatus stories={stories} wasReused={wasReused} />
    </>
  );
}

/**
 * Renders the block.
 *
 * @returns the block
 */
export function DownloadMyStoriesBlock() {
  const { t } = useDataExportTranslation();
  const { stories, isKnown, loadFailed } = useLiveStories();
  // The "ready" notification links to #download-my-stories; the block grows once the stories
  // arrive, so it is brought into view again then.
  useScrollToHash(isKnown);
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
      {stories.length > 0 && <StoriesForm stories={stories} />}
    </div>
  );
}
