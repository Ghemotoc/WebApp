/**
 * usePlayCaret: what the play editor's screen parts need to know after every change (LAYOUTS-2;
 * board D14): which block the caret is in (the toolbar's pressed button, the tag in the margin,
 * the Characters panel's highlighted name), the names suggested under it, and the footer's counts
 * ("7 lines · 2 directions", and each character's lines).
 *
 * It listens to the editor's transactions, which include the Up and Down keys moving through the
 * suggestions (playMode.ts sends one for them), and answers nothing while the chapter isn't a play.
 * Who calls it: ChapterEditorPage (useLoadedEditor). What it calls: playCommands.ts, playMode.ts
 * and playDocument.ts.
 */
import type { Editor } from '@tiptap/react';
import { useEffect, useState } from 'react';

import type { EditorNode } from '../lib/chapterMarkdown';
import { currentPlayBlock, speechName, type PlayBlockKind } from '../lib/playCommands';
import { countPlayBlocks, type PlayCounts } from '../lib/playDocument';
import { visibleSuggestions, type VisibleSuggestions } from '../lib/playMode';

/** The play editor's state after the latest change. */
export interface PlayCaret {
  /** The kind of block the caret is in, or null (outside a play, or in a list or a quote). */
  kind: PlayBlockKind | null;
  /** Where that block starts, for placing the tag and the suggestions beside it. */
  blockPosition: number;
  /** The name of the speech the caret is in, or ''. */
  speakerName: string;
  suggestions: VisibleSuggestions;
  counts: PlayCounts;
}

/** The state when the chapter isn't a play. */
const notAPlay: PlayCaret = {
  kind: null,
  blockPosition: -1,
  speakerName: '',
  suggestions: { items: [], activeIndex: 0, blockPosition: -1 },
  counts: { lines: 0, directions: 0, linesByName: new Map() },
};

/** Reads the state from the editor as it is now. */
function readCaret(editor: Editor): PlayCaret {
  const block = currentPlayBlock(editor.state);
  return {
    kind: block?.kind ?? null,
    blockPosition: block?.blockPosition ?? -1,
    speakerName: block === null ? '' : speechName(block.node),
    suggestions: visibleSuggestions(editor),
    counts: countPlayBlocks(editor.getJSON() as EditorNode),
  };
}

/**
 * Follows the caret and the counts in a play.
 *
 * @param editor - the chapter editor (null until TipTap is ready)
 * @param isPlay - true when the chapter's layout is Play
 * @returns the state, refreshed after every change
 */
export function usePlayCaret(editor: Editor | null, isPlay: boolean): PlayCaret {
  const [caret, setCaret] = useState<PlayCaret>(notAPlay);
  useEffect(() => {
    if (editor === null || !isPlay) {
      setCaret(notAPlay);
      return;
    }
    const follow = () => setCaret(readCaret(editor));
    follow();
    editor.on('transaction', follow);
    // Focus moving away hides the suggestions' list; it shows again when the text gets focus.
    editor.on('focus', follow);
    return () => {
      editor.off('transaction', follow);
      editor.off('focus', follow);
    };
  }, [editor, isPlay]);
  return caret;
}
