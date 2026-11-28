/**
 * EditorPaper: the sheet of story paper the writer types on (board D05, user story 5.5).
 *
 * Top to bottom, as the board draws it: "Chapter 16" in the meta type, the chapter's title as a
 * big Literata line over a 1 px control line (its label "Chapter title" is for screen readers
 * only), the text itself 24 px below in Literata 20/34, and the foot: the word count at the left
 * and the save ("Saved at 14:02") at the right, over a hairline. The paper is the story paper
 * (--story-paper), 48 by 64 px inside from 1024 px, 48 by 32 on tablets and 32 by 16 on phones;
 * poems keep their lines and stanzas through `.tmc-poem` (MUST-2).
 * Layout (LAYOUTS-1, boards D14 and D15): Prose, Play or Poem at the right of the "Chapter 16"
 * line (LayoutChoice); it wraps under it on a phone.
 * Footnotes (BOOKS-D05b, board D13): the open note's box sits in the text area, under its number,
 * the chapter's notes are listed under the text ("Notes"), and while there are notes the word
 * count says "notes not counted".
 * A play (LAYOUTS-2, board D14): the text takes the play's look (`.tmc-play`: names beside their
 * lines, stacked on phones), the block with the caret has its tag in the margin (PlayBlockTag),
 * names are suggested under the name being typed (PlayNameSuggestions), and the foot counts lines
 * and directions too ("412 words · 7 lines · 2 directions").
 * Who uses it: ChapterEditorPage. What it calls: TipTap's EditorContent, SaveWord,
 * FootnoteNotePanel, EditorFootnoteList, LayoutChoice, PlayBlockTag and PlayNameSuggestions.
 */
import { EditorContent, type Editor } from '@tiptap/react';
import { useRef, type RefObject } from 'react';

import { MAXIMUM_CHAPTER_TITLE_LENGTH } from '@/schemas/chapter';

import type { SaveState } from '../hooks/useAutosave';
import type { ChapterLayoutState } from '../hooks/useChapterLayout';
import type { FootnoteEditing } from '../hooks/useFootnoteEditing';
import type { PlayCaret } from '../hooks/usePlayCaret';
import { EditingChapterContext } from '../lib/editingChapter';
import { useEditorTranslation } from '../registerEditorTranslations';

import { EditorFootnoteList } from './EditorFootnoteList';
import { FootnoteNotePanel } from './FootnoteNotePanel';
import { LayoutChoice } from './LayoutChoice';
import { PlayBlockTag } from './PlayBlockTag';
import { PlayNameSuggestions } from './PlayNameSuggestions';
import { SaveWord } from './SaveWord';

/** What the paper needs. */
export interface EditorPaperProps {
  chapterId: string;
  chapterNumber: number;
  title: string;
  onTitleChange: (value: string) => void;
  /** Leaving the title saves at once, as leaving the text does. */
  onTitleBlur: () => void;
  editor: Editor | null;
  /** The chapter's layout and its change (useChapterLayout). */
  layout: ChapterLayoutState;
  wordCount: number;
  saveState: SaveState;
  /** The chapter's footnotes and the open note (useFootnoteEditing). */
  footnotes: FootnoteEditing;
  /** The play's caret and counts (usePlayCaret), read only while the layout is Play. */
  playCaret: PlayCaret;
}

/** What the foot's count line needs. */
interface WordCountLineProps {
  wordCount: number;
  hasNotes: boolean;
  /** A play's lines and directions, or null for prose and poems. */
  playCounts: { lines: number; directions: number } | null;
}

/**
 * The foot's word count, with "notes not counted" while the chapter has notes (board D13), and a
 * play's lines and directions (board D14: "412 words · 7 lines · 2 directions").
 */
function WordCountLine({ wordCount, hasNotes, playCounts }: WordCountLineProps) {
  const { t } = useEditorTranslation();
  const parts = [t('wordCount', { count: wordCount })];
  if (playCounts !== null) {
    parts.push(t('play.lines', { count: playCounts.lines }));
    parts.push(t('play.directions', { count: playCounts.directions }));
  }
  if (hasNotes) parts.push(t('footnote.notesNotCounted'));
  return <span className="type-meta text-ink-muted">{parts.join(' · ')}</span>;
}

/** A play's tag beside the block with the caret and the names suggested under a name. */
function PlayOverlays(props: {
  editor: Editor;
  caret: PlayCaret;
  containerRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <>
      <PlayBlockTag {...props} />
      <PlayNameSuggestions {...props} />
    </>
  );
}

/** The text area's classes for the layout: a poem's lines or a play's blocks. */
function layoutClass(layout: EditorPaperProps['layout']['layout']): string {
  if (layout === 'poem') return 'tmc-poem';
  if (layout === 'play') return 'tmc-play';
  return '';
}

/**
 * Renders the paper.
 *
 * @returns the paper with the title, the text and the foot
 */
export function EditorPaper(props: EditorPaperProps) {
  const { t } = useEditorTranslation();
  // The text area, where the open note's box is placed under its number.
  const textAreaRef = useRef<HTMLDivElement>(null);
  const isPlay = props.layout.layout === 'play';
  return (
    <div className="rounded-card bg-story-paper px-4 py-8 text-ink sm:px-8 sm:py-12 lg:px-16">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 type-meta text-ink-muted">
          {t('chapterNumber', { number: props.chapterNumber })}
        </p>
        <LayoutChoice {...props.layout} />
      </div>
      <label htmlFor="chapter-title" className="sr-only">
        {t('titleLabel')}
      </label>
      <input
        id="chapter-title"
        type="text"
        value={props.title}
        maxLength={MAXIMUM_CHAPTER_TITLE_LENGTH}
        autoComplete="off"
        onChange={(event) => props.onTitleChange(event.target.value)}
        onBlur={props.onTitleBlur}
        className="tmc-editor-title min-h-11 w-full border-0 border-b border-control-border bg-transparent p-0 text-ink-heading"
      />
      <div
        ref={textAreaRef}
        // A play's text keeps the board's own type and its 148 px name column (D14), so the look
        // check leaves it out, as it leaves out the reader's story text.
        data-story-text={isPlay ? '' : undefined}
        className={`tmc-chapter-text tmc-chapter-text--editor relative mt-6 ${layoutClass(props.layout.layout)}`}
      >
        {/* The blocks inside the text (pictures, cards) read the chapter from here (GAPS-8). */}
        <EditingChapterContext value={props.chapterId}>
          <EditorContent editor={props.editor} />
        </EditingChapterContext>
        {props.editor !== null && (
          <FootnoteNotePanel
            editor={props.editor}
            footnotes={props.footnotes}
            containerRef={textAreaRef}
          />
        )}
        {props.editor !== null && isPlay && (
          <PlayOverlays editor={props.editor} caret={props.playCaret} containerRef={textAreaRef} />
        )}
      </div>
      <EditorFootnoteList footnotes={props.footnotes} />
      <div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-hairline pt-4">
        <WordCountLine
          wordCount={props.wordCount}
          hasNotes={props.footnotes.footnotes.length > 0}
          playCounts={isPlay ? props.playCaret.counts : null}
        />
        <SaveWord state={props.saveState} withTime />
      </div>
    </div>
  );
}
