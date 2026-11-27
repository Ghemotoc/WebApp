/**
 * useFootnoteEditing: the chapter editor's footnotes, and which note is open (BOOKS-D05b; board
 * D13-EditorFootnotes, approved "as drawn").
 *
 * What it keeps: the chapter's footnotes in order (for the Notes list at the end of the paper and
 * the "notes not counted" line) and the place of the footnote whose note is open. The place
 * follows every change to the text (ProseMirror's mapping), so typing elsewhere never loses it.
 * What it offers:
 * - insert: the toolbar's "fn" and Ctrl+Alt+F put an empty footnote at the cursor and open it
 *   (board D13, label 1: "fn puts a number at the cursor and opens its note");
 * - open: a number in the text, or Edit in the Notes list, opens that note;
 * - changeNote: the note box writes each change straight into the footnote, so the autosave
 *   saves it like any other edit;
 * - remove and close: Remove takes the footnote out; closing a note left empty takes it out too,
 *   so the text never keeps a number without a note. Closing puts the caret just after the number.
 * Who calls it: ChapterEditorPage (useLoadedEditor). What it calls: the chapterFootnote node's
 * storage and helpers (lib/chapterFootnoteNode.ts).
 */
import type { Editor } from '@tiptap/react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  footnotesInDocument,
  insertChapterFootnote,
  type EditorFootnote,
} from '../lib/chapterFootnoteNode';

/** The open note, for the note box. */
export interface OpenFootnote {
  position: number;
  number: number;
  note: string;
}

/** What the hook gives back. */
export interface FootnoteEditing {
  footnotes: EditorFootnote[];
  openNote: OpenFootnote | null;
  insert: () => void;
  open: (position: number) => void;
  changeNote: (note: string) => void;
  remove: () => void;
  close: () => void;
}

/**
 * Keeps the footnote list and the open place in step with the editor.
 *
 * @param editor - the chapter editor, or null while TipTap starts
 * @returns the footnotes, the open place and a way to set it
 */
function useFootnoteState(editor: Editor | null) {
  const [footnotes, setFootnotes] = useState<EditorFootnote[]>([]);
  const [openPosition, setOpenPosition] = useState<number | null>(null);
  useEffect(() => {
    if (editor === null) return undefined;
    /** Step 1: every change re-reads the footnotes and moves the open place with the text. */
    function follow({ transaction }: { transaction: Editor['state']['tr'] }) {
      setFootnotes(footnotesInDocument(transaction.doc));
      setOpenPosition((current) => (current === null ? null : transaction.mapping.map(current)));
    }
    // Step 2: once for the chapter as it loaded, then on every change.
    setFootnotes(footnotesInDocument(editor.state.doc));
    editor.on('transaction', follow);
    return () => {
      editor.off('transaction', follow);
    };
  }, [editor]);
  // Step 3: the node views read the open place from the node's storage.
  useEffect(() => {
    if (editor !== null) editor.storage.chapterFootnote.openPosition = openPosition;
  }, [editor, openPosition]);
  return { footnotes, openPosition, setOpenPosition };
}

/**
 * Starts the footnote handling for one editor.
 *
 * @param editor - the chapter editor, or null while TipTap starts
 * @returns the footnotes, the open note and the actions on it
 */
export function useFootnoteEditing(editor: Editor | null): FootnoteEditing {
  const { footnotes, openPosition, setOpenPosition } = useFootnoteState(editor);

  /** Opens a note and tells the numbers in the text, so the open one shows as open. */
  const open = useCallback(
    (position: number) => {
      setOpenPosition(position);
      if (editor === null) return;
      editor.storage.chapterFootnote.openPosition = position;
      editor.view.dispatch(editor.state.tr.setMeta('footnoteOpened', position));
    },
    [editor, setOpenPosition],
  );

  /** Puts a new footnote at the cursor and opens it. */
  const insert = useCallback(() => {
    if (editor !== null) open(insertChapterFootnote(editor));
  }, [editor, open]);

  // The node's shortcut (Ctrl+Alt+F) and its numbers call these through the storage.
  useEffect(() => {
    if (editor === null) return;
    editor.storage.chapterFootnote.openNote = open;
    editor.storage.chapterFootnote.insertNote = insert;
  }, [editor, open, insert]);

  const actions = useNoteActions(editor, openPosition, setOpenPosition);
  const openNote = useMemo(() => {
    const index = footnotes.findIndex((footnote) => footnote.position === openPosition);
    const footnote = footnotes[index];
    if (footnote === undefined) return null;
    return { position: footnote.position, number: index + 1, note: footnote.note };
  }, [footnotes, openPosition]);
  return { footnotes, openNote, insert, open, ...actions };
}

/**
 * The actions on the open note: change its words, remove it, close it.
 *
 * @param editor - the chapter editor
 * @param openPosition - the open footnote's place, or null
 * @param setOpenPosition - sets the open place
 * @returns changeNote, remove and close
 */
function useNoteActions(
  editor: Editor | null,
  openPosition: number | null,
  setOpenPosition: (position: number | null) => void,
) {
  /** Writes the note's words into the footnote (one step of the editor's history each). */
  function changeNote(note: string) {
    if (editor === null || openPosition === null) return;
    editor.view.dispatch(editor.state.tr.setNodeAttribute(openPosition, 'note', note));
  }

  /** Takes the footnote out and puts the caret where it was. */
  function remove() {
    if (editor === null || openPosition === null) return;
    setOpenPosition(null);
    editor.storage.chapterFootnote.openPosition = null;
    editor
      .chain()
      .focus()
      .deleteRange({ from: openPosition, to: openPosition + 1 })
      .run();
  }

  /** Closes the note; one left empty is taken out, so no number stands without its note. */
  function close() {
    if (editor === null || openPosition === null) return;
    const note = String(editor.state.doc.nodeAt(openPosition)?.attrs.note ?? '');
    if (note.trim() === '') {
      remove();
      return;
    }
    setOpenPosition(null);
    editor.storage.chapterFootnote.openPosition = null;
    editor.view.dispatch(editor.state.tr.setMeta('footnoteClosed', openPosition));
    editor
      .chain()
      .focus(openPosition + 1)
      .run();
  }

  return { changeNote, remove, close };
}
