/**
 * ChapterChoice: "All chapters" or "Only the chapters I choose" in Settings › Download my stories
 * (story S1-E13-05; Robert, 1 Nov 2026, 06:27: "download just specific chapters"). Choosing the
 * second shows a checkbox for each live chapter, drafts marked.
 * Who shows it: DownloadMyStoriesBlock, for one story with the chapters ticked. What it calls:
 * useChapterChoices.
 */
import { Notice } from '@/components/ui/Notice';

import type { ChapterChoice as Chapter } from '../api/dataExport';
import { useChapterChoices } from '../hooks/useStoriesExport';
import { useDataExportTranslation } from '../registerDataExportTranslations';

/** What the choice needs: the story, the mode, the ticked chapters and how to change them. */
interface ChapterChoiceProps {
  storyId: string;
  onlyChosen: boolean;
  chosenIds: ReadonlySet<string>;
  onModeChange: (onlyChosen: boolean) => void;
  onChosenChange: (chosenIds: Set<string>) => void;
}

/** A chapter's name: "Chapter 2: The storm", with "(draft)" when it isn't published. */
function useChapterName() {
  const { t } = useDataExportTranslation();
  return (chapter: Chapter) => {
    const name =
      chapter.title.trim() === ''
        ? t('word.chapterNumber', { number: chapter.position })
        : t('stories.chapters.option', { number: chapter.position, title: chapter.title });
    return chapter.isDraft ? t('stories.draftOption', { title: name }) : name;
  };
}

/** The two radio buttons. */
function ModeRadios({
  onlyChosen,
  onModeChange,
}: Pick<ChapterChoiceProps, 'onlyChosen' | 'onModeChange'>) {
  const { t } = useDataExportTranslation();
  const modes = [
    { id: 'download-chapters-all', value: false, label: t('stories.chapters.all') },
    { id: 'download-chapters-chosen', value: true, label: t('stories.chapters.chosen') },
  ];
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-1">
      {modes.map((mode) => (
        <div key={mode.id} className="flex min-h-11 items-center gap-2.5">
          <input
            id={mode.id}
            type="radio"
            name="download-chapters-mode"
            className="h-5 w-5"
            checked={onlyChosen === mode.value}
            onChange={() => onModeChange(mode.value)}
          />
          <label htmlFor={mode.id} className="text-[15px] text-heading">
            {mode.label}
          </label>
        </div>
      ))}
    </div>
  );
}

/** The chapters' checkboxes. */
function ChapterBoxes({
  storyId,
  chosenIds,
  onChosenChange,
}: Omit<ChapterChoiceProps, 'onlyChosen' | 'onModeChange'>) {
  const { t } = useDataExportTranslation();
  const chapterName = useChapterName();
  const chapters = useChapterChoices(storyId);
  if (chapters.isError) return <Notice tone="error">{t('stories.chapters.loadFailed')}</Notice>;
  const list = chapters.data ?? [];
  if (chapters.isSuccess && list.length === 0) {
    return <p className="m-0 text-[15px] text-body">{t('stories.chapters.none')}</p>;
  }

  /** Ticks or unticks one chapter. */
  function toggle(chapterId: string, isTicked: boolean) {
    const next = new Set(chosenIds);
    if (isTicked) next.add(chapterId);
    else next.delete(chapterId);
    onChosenChange(next);
  }

  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {list.map((chapter) => (
        <li
          key={chapter.id}
          className="flex min-h-11 items-center gap-2.5 border-t border-hairline py-1.5 first:border-t-0"
        >
          <input
            id={`download-chapter-${chapter.id}`}
            type="checkbox"
            className="h-5 w-5 shrink-0"
            checked={chosenIds.has(chapter.id)}
            onChange={(changed) => toggle(chapter.id, changed.target.checked)}
          />
          <label
            htmlFor={`download-chapter-${chapter.id}`}
            className="min-w-0 text-[15px] break-words text-heading"
          >
            {chapterName(chapter)}
          </label>
        </li>
      ))}
    </ul>
  );
}

/**
 * Renders the chapter choice.
 *
 * @returns the "Chapters" group
 */
export function ChapterChoice(props: ChapterChoiceProps) {
  const { t } = useDataExportTranslation();
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-1 border-0 p-0">
      <legend className="mb-1 eyebrow">{t('stories.chapters.legend')}</legend>
      <ModeRadios onlyChosen={props.onlyChosen} onModeChange={props.onModeChange} />
      {props.onlyChosen && (
        <ChapterBoxes
          storyId={props.storyId}
          chosenIds={props.chosenIds}
          onChosenChange={props.onChosenChange}
        />
      )}
    </fieldset>
  );
}
