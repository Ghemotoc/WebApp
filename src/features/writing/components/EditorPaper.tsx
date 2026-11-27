/**
 * EditorPaper: the sheet of story paper the writer types on (board D05, user story 5.5).
 *
 * Top to bottom, as the board draws it: "Chapter 16" in the meta type, the chapter's title as a
 * big Literata line over a 1 px control line (its label "Chapter title" is for screen readers
 * only), the text itself 24 px below in Literata 20/34, and the foot: the word count at the left
 * and the save ("Saved at 14:02") at the right, over a hairline. The paper is the story paper
 * (--story-paper), 48 by 64 px inside from 1024 px, 48 by 32 on tablets and 32 by 16 on phones;
 * poems keep their lines and stanzas through `.tmc-poem` (MUST-2).
 * Footnotes (BOOKS-D05b, board D13): the open note's box sits in the text area, under its number,
 * the chapter's notes are listed under the text ("Notes"), and while there are notes the word
 * count says "notes not counted".
 * Who uses it: ChapterEditorPage. What it calls: TipTap's EditorContent, SaveWord,
 * FootnoteNotePanel and EditorFootnoteList.
 */
import { EditorContent, type Editor } from '@tiptap/react';
import { useRef } from 'react';

import { MAXIMUM_CHAPTER_TITLE_LENGTH } from '@/schemas/chapter';

import type { SaveState } from '../hooks/useAutosave';
import type { FootnoteEditing } from '../hooks/useFootnoteEditing';
import { EditingChapterContext } from '../lib/editingChapter';
import { useEditorTranslation } from '../registerEditorTranslations';

import { EditorFootnoteList } from './EditorFootnoteList';
import { FootnoteNotePanel } from './FootnoteNotePanel';
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
  isPoem: boolean;
  wordCount: number;
  saveState: SaveState;
  /** The chapter's footnotes and the open note (useFootnoteEditing). */
  footnotes: FootnoteEditing;
}

/** The foot's word count, with "notes not counted" while the chapter has notes (board D13). */
function WordCountLine({ wordCount, hasNotes }: { wordCount: number; hasNotes: boolean }) {
  const { t } = useEditorTranslation();
  const words = t('wordCount', { count: wordCount });
  return (
    <span className="type-meta text-ink-muted">
      {hasNotes ? `${words} · ${t('footnote.notesNotCounted')}` : words}
    </span>
  );
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
  return (
    <div className="rounded-card bg-story-paper px-4 py-8 text-ink sm:px-8 sm:py-12 lg:px-16">
      <p className="m-0 mb-1 type-meta text-ink-muted">
        {t('chapterNumber', { number: props.chapterNumber })}
      </p>
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
        className={`tmc-chapter-text tmc-chapter-text--editor relative mt-6 ${props.isPoem ? 'tmc-poem' : ''}`}
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
      </div>
      <EditorFootnoteList footnotes={props.footnotes} />
      <div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-hairline pt-4">
        <WordCountLine
          wordCount={props.wordCount}
          hasNotes={props.footnotes.footnotes.length > 0}
        />
        <SaveWord state={props.saveState} withTime />
      </div>
    </div>
  );
}
