/**
 * The footnote in the chapter editor (BOOKS-D05b; board D13-EditorFootnotes, approved "as drawn").
 *
 * A footnote is one inline node that can't be typed into (an atom). It holds the note's words and
 * nothing else, so the stored text only ever says `[The note.](footnote:)` where it sits
 * (chapterMarkdown.ts, src/lib/chapter-footnotes.ts). Its number is never stored: it is the
 * footnote's place among the chapter's footnotes, worked out again on every change.
 * The editor draws it with ChapterFootnoteNodeView: the small raised number in a soft chip, a
 * button that opens its note. The note itself is written in FootnoteNotePanel, outside the text,
 * so typing in the note never moves the caret in the chapter.
 * How it is added: the toolbar's "fn" button or Ctrl+Alt+F (board D13: "fn puts a number at the
 * cursor and opens its note"). The editor's own words leave it out (renderText gives ''), so the
 * word count doesn't count notes, as the database's count_words() doesn't (board D13, "notes not
 * counted"). Pasted HTML never makes one (parseHTML is empty, like pictures).
 * Who uses it: editorExtensions.ts; useFootnoteEditing (hooks/) sets the storage's openers.
 */
import { Node } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { ReactNodeViewRenderer, type Editor } from '@tiptap/react';

import { ChapterFootnoteNodeView } from '../components/ChapterFootnoteNodeView';

/** The node's name, as the converters and the editor's JSON write it. */
export const CHAPTER_FOOTNOTE_NODE = 'chapterFootnote';

/** What the node keeps between the editor and the screen (set by useFootnoteEditing). */
export interface ChapterFootnoteStorage {
  /** Opens the note of the footnote at this place in the document. */
  openNote: (position: number) => void;
  /** Puts a new footnote at the cursor and opens its note (the toolbar and Ctrl+Alt+F). */
  insertNote: () => void;
  /** The place of the footnote whose note is open, or null; node views read it. */
  openPosition: number | null;
}

declare module '@tiptap/core' {
  interface Storage {
    chapterFootnote: ChapterFootnoteStorage;
  }
}

/** One footnote in the document: where it is and its note. */
export interface EditorFootnote {
  position: number;
  note: string;
}

/** The footnote node. */
export const ChapterFootnoteNode = Node.create<Record<string, never>, ChapterFootnoteStorage>({
  name: CHAPTER_FOOTNOTE_NODE,
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,
  // Never bold, italic or a link: the stored form has no place for marks on a footnote.
  marks: '',
  addAttributes() {
    return { note: { default: '' } };
  },
  addStorage() {
    return { openNote: () => undefined, insertNote: () => undefined, openPosition: null };
  },
  // Never read from pasted or dropped HTML, like pictures.
  parseHTML() {
    return [];
  },
  renderHTML() {
    return ['sup', { 'data-chapter-footnote': '' }];
  },
  // The note isn't the chapter's words: the word count and the compare view leave it out.
  renderText() {
    return '';
  },
  addKeyboardShortcuts() {
    return {
      // Board D13: "Footnote (Ctrl+Alt+F)".
      'Mod-Alt-f': () => {
        this.storage.insertNote();
        return true;
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ChapterFootnoteNodeView);
  },
});

/**
 * Every footnote in a document, in the text's order.
 *
 * @param document - the editor's document
 * @returns each footnote's place and note; footnote 1 first
 */
export function footnotesInDocument(document: ProseMirrorNode): EditorFootnote[] {
  const found: EditorFootnote[] = [];
  document.descendants((node, position) => {
    if (node.type.name !== CHAPTER_FOOTNOTE_NODE) return true;
    found.push({ position, note: String(node.attrs.note ?? '') });
    return false;
  });
  return found;
}

/**
 * A footnote's number: its place among the document's footnotes, from 1.
 *
 * @param document - the editor's document
 * @param position - the footnote's place
 * @returns the number, or 0 when there is no footnote there
 */
export function footnoteNumberAt(document: ProseMirrorNode, position: number): number {
  const index = footnotesInDocument(document).findIndex(
    (footnote) => footnote.position === position,
  );
  return index + 1;
}

/**
 * Puts an empty footnote at the cursor (after a selection, never over it) and gives back its place.
 *
 * @param editor - the chapter editor
 * @returns the new footnote's place in the document
 */
export function insertChapterFootnote(editor: Editor): number {
  const position = editor.state.selection.to;
  // No focus() here: TipTap focuses the text one frame later, which would take the focus back
  // from the note's field as its box opens (board D13: the box opens with the focus in the field).
  editor
    .chain()
    .insertContentAt(position, { type: CHAPTER_FOOTNOTE_NODE, attrs: { note: '' } })
    .run();
  return position;
}
