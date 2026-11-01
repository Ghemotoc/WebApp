/**
 * ChapterInsights: "Lines and stops" on the writer dashboard, one published chapter's most-loved
 * lines and where readers stop (bundle IDEAS-1, part d; ideas IDEA-20261031-1 and -5).
 *
 * The writer picks a chapter from a drop-down (the first published one is chosen at the start).
 * Everything here is a total: no reader is ever named, and small numbers show as "fewer than 5"
 * (S1-E3-07's rule), so a writer can't work out who stopped where.
 * Who shows it: YourWritingPage, between "Story by story" and "Latest on your chapters".
 * What it calls: useChapterInsights, then LovedLines and ReaderStopsBar.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { Select, type SelectOption } from '@/components/ui/Select';

import type { DashboardChapter } from '../api/dashboard';
import { useChapterInsights } from '../hooks/useChapterInsights';

import { LovedLines } from './LovedLines';
import { ReaderStopsBar } from './ReaderStopsBar';

/** What the section needs. */
export interface ChapterInsightsProps {
  /** Every chapter on the dashboard; only published ones are offered. */
  chapters: DashboardChapter[];
  /** Story titles by slug, for the drop-down's labels. */
  storyTitles: Map<string, string>;
}

/**
 * A chapter's value in the drop-down: its story's slug and its code, which together find it.
 *
 * @returns "slug/code"
 */
function optionValue(chapter: DashboardChapter): string {
  return `${chapter.storySlug}/${chapter.chapterCode}`;
}

/**
 * The numbers for the chosen chapter: a wait, a message or the two panels.
 *
 * @returns the body under the drop-down
 */
function InsightsBody({ chapter }: { chapter: DashboardChapter }) {
  const { t } = useTranslation('writing');
  const { insights, isLoading, loadFailed } = useChapterInsights(
    chapter.storySlug,
    chapter.chapterCode,
  );
  if (loadFailed) return <Notice tone="error">{t('insights.loadFailed')}</Notice>;
  if (isLoading || insights === null) return null;
  return (
    <div className="grid gap-8 md:grid-cols-2">
      <LovedLines lines={insights.lovedLines} />
      <ReaderStopsBar stops={insights.stops} />
    </div>
  );
}

/**
 * Renders the section, or nothing while the writer has no published chapter.
 *
 * @returns the "Lines and stops" section
 */
export function ChapterInsights({ chapters, storyTitles }: ChapterInsightsProps) {
  const { t } = useTranslation('writing');
  const published = chapters.filter((chapter) => chapter.status === 'published');
  // Step 1: the writer's choice; null means "the first published chapter".
  const [chosenValue, setChosenValue] = useState<string | null>(null);
  const chosen =
    published.find((chapter) => optionValue(chapter) === chosenValue) ?? published.at(0);
  if (chosen === undefined) return null;
  // Step 2: one option per published chapter, "<story> · Chapter n: <title>".
  const options: SelectOption[] = published.map((chapter) => ({
    value: optionValue(chapter),
    label: t('insights.option', {
      story: storyTitles.get(chapter.storySlug) ?? '',
      number: chapter.position,
      title: chapter.title,
    }),
  }));
  return (
    <section aria-labelledby="chapter-insights-heading" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <Eyebrow>{t('insights.eyebrow')}</Eyebrow>
        <h2
          id="chapter-insights-heading"
          className="m-0 font-heading text-[30px] font-bold text-heading"
        >
          {t('insights.heading')}
        </h2>
        <p className="m-0 text-body">{t('insights.intro')}</p>
      </div>
      <Select
        id="chapter-insights-chapter"
        label={t('insights.chapterLabel')}
        isLabelVisible
        options={options}
        value={optionValue(chosen)}
        onChange={setChosenValue}
      />
      <InsightsBody chapter={chosen} />
    </section>
  );
}
