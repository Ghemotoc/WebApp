/**
 * useRememberedCaret: Write puts the caret back where the writer left it, per story (design books
 * item 17, "Don't start from zero"; Tidwell's "Changes in Midstream").
 *
 * How:
 * - While the writer types or moves the caret, its place (the chapter's code and a position in
 *   the text) is kept a second after the last move, and at once when the text loses focus: in the
 *   account when signed in, in this browser too (useRememberedPlace).
 * - When the same chapter opens again, the caret goes back there, the text takes the focus and the
 *   line scrolls into view. Only once, and only if the writer hasn't clicked anywhere first. Another
 *   chapter of the story starts as before.
 * Who calls it: ChapterEditorPage's useLoadedEditor. What it calls: useRememberedPlace and the
 * TipTap editor's commands.
 */
import type { Editor } from '@tiptap/react';
import { useEffect, useRef } from 'react';

import type { Json } from '@/lib/database.types';
import { useRememberedPlace } from '@/lib/remembered/useRememberedPlace';

/** How long after the last caret move its place is kept. */
const keepDelayMilliseconds = 1000;

/** A caret place: the chapter it is in and the position in the text. */
interface CaretPlace {
  chapterCode: string;
  position: number;
}

/** Reads a stored caret place, or null when there is none or it is not a caret place. */
function caretInPlace(place: Json | null): CaretPlace | null {
  if (place === null || typeof place !== 'object' || Array.isArray(place)) return null;
  const { chapterCode, position } = place;
  if (typeof chapterCode !== 'string' || typeof position !== 'number') return null;
  return { chapterCode, position };
}

/**
 * Puts the caret back once, when the remembered place is in this chapter.
 *
 * @param editor - the chapter's editor, or null while TipTap starts
 * @param caret - the remembered place, or null
 * @param chapterCode - the chapter open now
 * @param isSettled - the account has answered, so the place is the latest one
 */
function useRestoreCaret(
  editor: Editor | null,
  caret: CaretPlace | null,
  chapterCode: string,
  isSettled: boolean,
): void {
  const hasRestored = useRef(false);
  useEffect(() => {
    if (editor === null || !isSettled || hasRestored.current) return;
    hasRestored.current = true;
    // The writer got there first, or the place is in another chapter: leave the caret alone.
    if (editor.isFocused || caret === null || caret.chapterCode !== chapterCode) return;
    // The text may have become shorter on another device: stay inside it.
    const position = Math.min(Math.max(caret.position, 0), editor.state.doc.content.size);
    editor.chain().focus(position, { scrollIntoView: true }).run();
  }, [editor, caret, chapterCode, isSettled]);
}

/**
 * Keeps the caret's place and puts it back when the chapter opens again.
 *
 * @param editor - the chapter's editor, or null while TipTap starts
 * @param storySlug - the story's address (the place is kept per story)
 * @param chapterCode - the chapter open now
 */
export function useRememberedCaret(
  editor: Editor | null,
  storySlug: string,
  chapterCode: string,
): void {
  const { place, isSettled, remember } = useRememberedPlace('write_caret', storySlug);
  useRestoreCaret(editor, caretInPlace(place), chapterCode, isSettled);
  // Keep the place after the caret stops moving, and at once when the text loses focus.
  useEffect(() => {
    if (editor === null) return undefined;
    let timer: number | undefined;
    /** Sends the caret's place now. */
    const keep = () => {
      window.clearTimeout(timer);
      remember({ chapterCode, position: editor.state.selection.head });
    };
    /** Waits for the caret to stop before keeping it. */
    const keepLater = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(keep, keepDelayMilliseconds);
    };
    editor.on('selectionUpdate', keepLater);
    editor.on('blur', keep);
    return () => {
      window.clearTimeout(timer);
      editor.off('selectionUpdate', keepLater);
      editor.off('blur', keep);
    };
  }, [editor, chapterCode, remember]);
}
