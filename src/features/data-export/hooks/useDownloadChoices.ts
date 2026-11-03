/**
 * useDownloadChoices: what the writer has chosen in Settings › Download my stories, and the check
 * before "Get my files" (story S1-E13-05; Robert, 1 Nov 2026, 06:27 and 06:29).
 *
 * It keeps the story (or all), the three tick boxes, the format (Word, PDF or both; ADMIN-2d),
 * "All chapters" or "Only the chapters I choose" and the ticked chapters, and turns them into the
 * choices request_stories_export() takes. The database checks the same rules again (stories_export_choice_problem()).
 * Who calls it: DownloadMyStoriesBlock. What it calls: nothing.
 */
import { useState } from 'react';

import type { DocumentFormat, StoriesExportChoices } from '../api/dataExport';
import type { FileChoices } from '../components/StoriesFileChoices';

/** The value of "All my stories" in the drop-down. */
export const ALL_STORIES = 'all';

/** Why "Get my files" can't start yet, or null when it can. */
export type ChoiceProblem = 'nothingChosen' | 'noChapters' | null;

/** The choices as the screen holds them, and how to change each. */
export interface DownloadChoices {
  story: string;
  setStory: (story: string) => void;
  files: FileChoices;
  setFiles: (files: FileChoices) => void;
  /** Word files, PDF files or both, for the chapters and the plan. */
  documentFormat: DocumentFormat;
  setDocumentFormat: (format: DocumentFormat) => void;
  /** True when the chapters or the plan are ticked, so the format choice shows. */
  showsFormatChoice: boolean;
  onlyChosenChapters: boolean;
  setOnlyChosenChapters: (onlyChosen: boolean) => void;
  chosenChapterIds: Set<string>;
  setChosenChapterIds: (chapterIds: Set<string>) => void;
  /** True when one story is chosen with its chapters ticked, so the chapter choice shows. */
  showsChapterChoice: boolean;
}

/** By default everything readable is ticked; the JSON copy is for those who want it. */
const defaultFiles: FileChoices = { includeChapters: true, includePlan: true, includeData: false };

/**
 * Holds the choices.
 *
 * @returns the choices and their setters
 */
export function useDownloadChoices(): DownloadChoices {
  const [story, setStoryValue] = useState(ALL_STORIES);
  const [files, setFiles] = useState<FileChoices>(defaultFiles);
  // Word stays the default: it is the file a writer edits, and the accessible one (ADMIN-2d).
  const [documentFormat, setDocumentFormat] = useState<DocumentFormat>('word');
  const [onlyChosenChapters, setOnlyChosenChapters] = useState(false);
  const [chosenChapterIds, setChosenChapterIds] = useState<Set<string>>(new Set());

  /** A new story starts again from "All chapters". */
  function setStory(next: string) {
    setStoryValue(next);
    setOnlyChosenChapters(false);
    setChosenChapterIds(new Set());
  }

  return {
    story,
    setStory,
    files,
    setFiles,
    documentFormat,
    setDocumentFormat,
    showsFormatChoice: files.includeChapters || files.includePlan,
    onlyChosenChapters,
    setOnlyChosenChapters,
    chosenChapterIds,
    setChosenChapterIds,
    showsChapterChoice: story !== ALL_STORIES && files.includeChapters,
  };
}

/**
 * Why the choices can't be made yet: nothing ticked, or "Only the chapters I choose" with none.
 *
 * @returns the problem, or null
 */
export function choiceProblem(choices: DownloadChoices): ChoiceProblem {
  const { files } = choices;
  if (!files.includeChapters && !files.includePlan && !files.includeData) return 'nothingChosen';
  if (
    choices.showsChapterChoice &&
    choices.onlyChosenChapters &&
    choices.chosenChapterIds.size === 0
  )
    return 'noChapters';
  return null;
}

/**
 * The choices as request_stories_export() takes them.
 *
 * @returns the story (null for all), the chapters (null for every one), the three files and the
 *   format
 */
export function requestChoices(choices: DownloadChoices): StoriesExportChoices {
  const onlyChosen = choices.showsChapterChoice && choices.onlyChosenChapters;
  return {
    storyId: choices.story === ALL_STORIES ? null : choices.story,
    chapterIds: onlyChosen ? [...choices.chosenChapterIds].sort() : null,
    ...choices.files,
    documentFormat: choices.documentFormat,
  };
}
