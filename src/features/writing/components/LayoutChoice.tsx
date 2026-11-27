/**
 * LayoutChoice: "Layout" with Prose, Play and Poem at the top right of the editor's paper
 * (LAYOUTS-1; boards D14-EditorPlay and D15-EditorPoem: "Layout" beside a three-way choice on the
 * line with "Chapter 16"; it replaces MUST-2's Poem button in the formatting bar).
 *
 * A radio group (SegmentedControl): arrow keys move between the three, a screen reader hears
 * "Layout, Play, 2 of 3", and the hint under it (for screen readers) says what the picked layout
 * does. The word "Layout" beside the track is drawn for sight only; the group's own name is the
 * same word. While a change saves the group is busy; a failed change shows its notice above the
 * paper (ChapterEditorPage).
 * Who uses it: EditorPaper (the state comes from useChapterLayout, through ChapterEditorPage).
 * What it calls: SegmentedControl.
 */
import { useId } from 'react';

import { SegmentedControl } from '@/components/ui/SegmentedControl';

import { chapterLayouts, type ChapterLayout } from '../api/chapters';
import type { ChapterLayoutState } from '../hooks/useChapterLayout';
import { useEditorTranslation } from '../registerEditorTranslations';

/**
 * Renders the choice.
 *
 * @param props - useChapterLayout's answer
 * @returns the visible "Layout" word and the three-way choice, with its hint
 */
export function LayoutChoice({ layout, change, isSaving }: ChapterLayoutState) {
  const { t } = useEditorTranslation();
  const name = useId();
  const options = chapterLayouts.map((value) => ({
    value,
    label: t(`layout.options.${value}`),
  }));
  return (
    <div className="flex flex-wrap items-center gap-2" aria-busy={isSaving}>
      <span aria-hidden="true" className="type-meta text-ink-muted">
        {t('layout.label')}
      </span>
      <SegmentedControl<ChapterLayout>
        legend={t('layout.label')}
        isLegendVisible={false}
        name={`chapter-layout-${name}`}
        options={options}
        value={layout}
        onChange={change}
      />
      <span className="sr-only" aria-live="polite">
        {t(`layout.hints.${layout}`)}
      </span>
    </div>
  );
}
